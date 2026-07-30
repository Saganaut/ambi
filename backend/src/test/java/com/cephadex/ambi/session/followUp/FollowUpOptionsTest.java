package com.cephadex.ambi.session.followUp;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.function.Function;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;

/**
 * Minting the candidate board: the parent's kind decides what becomes an option,
 * ids are derived from content (so a re-mint is identical), and identical text
 * merges into one option owning every author.
 */
class FollowUpOptionsTest {

    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");
    private static final Function<AppImage, String> URLS = image -> "https://cdn/" + image.getSrcKey();

    @Test
    void mcqParentMintsTheAuthoredChoicesVerbatimAndInOrder() {
        Slide parent = slideWith(mcq(
                option("opt-a", "Alpha", null),
                option("opt-b", "Beta", null)));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new McqAnswer(Set.of("opt-a")), 100)), URLS).options();

        assertThat(options).extracting(option -> option.optionId()).containsExactly("opt-a", "opt-b");
        assertThat(options).extracting(option -> option.text()).containsExactly("Alpha", "Beta");
        assertThat(options).allSatisfy(o -> assertThat(o.authorParticipantIds()).isEmpty());
        assertThat(options).allSatisfy(o -> assertThat(o.imageUrl()).isNull());
    }

    @Test
    void mcqImageChoiceResolvesItsUrl() {
        Slide parent = slideWith(mcq(option("opt-a", null, image("s3/alpha.png"))));

        FollowUpOption minted = FollowUpOptions.mint(parent, List.of(), URLS).options().get(0);

        assertThat(minted.imageUrl()).isEqualTo("https://cdn/s3/alpha.png");
    }

    @Test
    void textParentMergesCaseAndWhitespaceVariantsAndUnionsAuthors() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Paris"), 100),
                answer("p-2", new TextAnswer("  paris "), 200),
                answer("p-3", new TextAnswer("Lyon"), 300)), URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris", "Lyon");
        assertThat(options.get(0).authorParticipantIds()).containsExactlyInAnyOrder("p-1", "p-2");
        assertThat(options.get(1).authorParticipantIds()).containsExactly("p-3");
    }

    @Test
    void caseSensitiveParentKeepsTheVariantsApart() {
        Slide parent = slideWith(text(true, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Paris"), 100),
                answer("p-2", new TextAnswer(" paris "), 200)), URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris", " paris ");
    }

    @Test
    void earliestRawSubmissionSuppliesTheMergedGroupsDisplayText() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-2", new TextAnswer("PARIS"), 500),
                answer("p-1", new TextAnswer("Paris"), 100)), URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris");
    }

    @Test
    void blankAndNonTextSubmissionsAreDropped() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("   "), 100),
                answer("p-2", new TextAnswer(null), 200),
                answer("p-3", new McqAnswer(Set.of("opt-a")), 300),
                answer("p-4", new TextAnswer("Lyon"), 400)), URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Lyon");
        assertThat(options.get(0).authorParticipantIds()).containsExactly("p-4");
    }

    @Test
    void textOptionsAreOrderedBySubmissionThenParticipantId() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-b", new TextAnswer("second"), 200),
                answer("p-c", new TextAnswer("tie-late"), 100),
                answer("p-a", new TextAnswer("tie-early"), 100)), URLS).options();

        assertThat(options).extracting(option -> option.text())
                .containsExactly("tie-early", "tie-late", "second");
    }

    @Test
    void drawingParentMintsOneOptionPerSubmittedImage() {
        Slide parent = slideWith(drawing());

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(null), 200),
                answer("p-3", new DrawingAnswer(image("s3/three.png")), 300)), URLS).options();

        assertThat(options).extracting(option -> option.imageUrl())
                .containsExactly("https://cdn/s3/one.png", "https://cdn/s3/three.png");
        assertThat(options).extracting(option -> option.text()).containsOnlyNulls();
        assertThat(options.get(0).authorParticipantIds()).containsExactly("p-1");
        assertThat(options.get(1).authorParticipantIds()).containsExactly("p-3");
    }

    @Test
    void mintingTwiceOverTheSameInputYieldsIdenticalIdsAndOrder() {
        Slide parent = slideWith(text(false, true));
        List<Answer> answers = List.of(
                answer("p-2", new TextAnswer("beta"), 200),
                answer("p-1", new TextAnswer("alpha"), 100));

        FollowUpOptionSet first = FollowUpOptions.mint(parent, answers, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.copyOf(answers), URLS);

        assertThat(second.options()).extracting(option -> option.optionId())
                .containsExactlyElementsOf(first.options().stream().map(option -> option.optionId()).toList());
        assertThat(second.options()).isEqualTo(first.options());
    }

    @Test
    void restartRemintOverReorderedAnswersReproducesIdenticalIdsAndOrderForTextParent() {
        Slide parent = slideWith(text(false, true));
        Answer parisEarly = answer("p-1", new TextAnswer("Paris"), 100);
        Answer lyon = answer("p-3", new TextAnswer("Lyon"), 200);
        Answer parisLate = answer("p-2", new TextAnswer("paris"), 300);

        FollowUpOptionSet first = FollowUpOptions.mint(parent, List.of(parisEarly, lyon, parisLate), URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.of(parisLate, parisEarly, lyon), URLS);

        assertThat(first.options()).extracting(option -> option.text()).containsExactly("Paris", "Lyon");
        assertThat(second.options()).isEqualTo(first.options());
        assertThat(second.options()).extracting(option -> option.optionId())
                .containsExactlyElementsOf(first.options().stream().map(option -> option.optionId()).toList());
    }

    @Test
    void restartRemintOverReorderedAnswersReproducesIdenticalIdsAndOrderForDrawingParent() {
        Slide parent = slideWith(drawing());
        Answer one = answer("p-1", new DrawingAnswer(image("s3/one.png")), 100);
        Answer two = answer("p-2", new DrawingAnswer(image("s3/two.png")), 200);
        Answer duplicateOfOne = answer("p-3", new DrawingAnswer(image("s3/one.png")), 300);

        FollowUpOptionSet first = FollowUpOptions.mint(parent, List.of(one, two, duplicateOfOne), URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.of(duplicateOfOne, one, two), URLS);

        assertThat(second.options()).isEqualTo(first.options());
        assertThat(second.options()).extracting(option -> option.optionId())
                .containsExactlyElementsOf(first.options().stream().map(option -> option.optionId()).toList());
    }

    @Test
    void answersWithNullSubmittedAtOrNullParticipantIdSortLastRatherThanThrowing() {
        Slide parent = slideWith(text(false, true));
        Answer first = answer("p-1", new TextAnswer("first"), 50);
        Answer nullSubmittedAt = answerWithNullSubmittedAt("p-x", new TextAnswer("null-submitted-at"));
        Answer nullSubmittedAtAndParticipant = answerWithNullSubmittedAt(null, new TextAnswer("null-participant"));

        List<FollowUpOption> options = FollowUpOptions.mint(parent,
                List.of(nullSubmittedAtAndParticipant, nullSubmittedAt, first), URLS).options();

        assertThat(options).extracting(option -> option.text())
                .containsExactly("first", "null-submitted-at", "null-participant");
    }

    @Test
    void unsupportedParentKindAndNoParentMintNothing() {
        assertThat(FollowUpOptions.mint(slideWith(new QAndAContent(null, false)), List.of(), URLS).options())
                .isEmpty();
        assertThat(FollowUpOptions.mint(null, List.of(), URLS).options()).isEmpty();
    }

    @Test
    void byIdFindsAMintedOptionAndReturnsNullOtherwise() {
        FollowUpOptionSet set = FollowUpOptions.mint(slideWith(mcq(option("opt-a", "Alpha", null))), List.of(), URLS);

        assertThat(set.byId("opt-a")).isNotNull();
        assertThat(set.byId("nope")).isNull();
        assertThat(FollowUpOptionSet.empty().byId("opt-a")).isNull();
    }

    // ── fixtures ───────────────────────────────────────────────────────────────

    private static Slide slideWith(SlideContent content) {
        Slide slide = new Slide();
        slide.setId("parent-slide");
        slide.setContent(content);
        return slide;
    }

    private static McqContent mcq(McqOption... options) {
        return new McqContent(List.of(options), Set.of(), McqDataVisualization.BAR_VERTICAL);
    }

    private static McqOption option(String id, String text, AppImage image) {
        return new McqOption(id, image == null ? McqOptionType.TEXT : McqOptionType.IMAGE, text, image, null);
    }

    private static TextContent text(boolean caseSensitive, boolean trimWhitespace) {
        return new TextContent(Set.of(), MatchMode.EXACT, caseSensitive, trimWhitespace, null);
    }

    private static DrawingContent drawing() {
        return new DrawingContent(null, PromptPlacement.ALONGSIDE, null, List.of(), Set.of());
    }

    private static AppImage image(String srcKey) {
        AppImage image = new AppImage();
        image.setSrcKey(srcKey);
        return image;
    }

    private static Answer answer(String participantId, AnswerPayload payload, long submittedAfterMs) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId("session-1");
        answer.setSlideId("parent-slide");
        answer.setSubmittedAt(START.plusMillis(submittedAfterMs));
        answer.setPayload(payload);
        return answer;
    }

    private static Answer answerWithNullSubmittedAt(String participantId, AnswerPayload payload) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId("session-1");
        answer.setSlideId("parent-slide");
        answer.setPayload(payload);
        return answer;
    }
}
