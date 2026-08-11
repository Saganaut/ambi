package com.cephadex.ambi.session.followUp;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Stream;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;

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
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;

/**
 * Minting the candidate board: the parent's kind decides what becomes an option,
 * ids are derived from content (so a re-mint reproduces the same cards), and
 * identical text merges into one option owning every author. Also the
 * {@code SPOT_THE_ANSWER} seeding, on both parent kinds that carry an authored
 * answer — the answer key's wording on TEXT, the authored {@code correctImage}
 * on DRAWING: which card carries the flag, how a matching submission merges
 * into it, that its id is derived from the same content every submitted card's
 * is, and that the board it lands on is shuffled rather than laid out in any
 * order a client could reconstruct or diff.
 */
class FollowUpOptionsTest {

    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");
    private static final Function<AppImage, String> URLS = image -> "https://cdn/" + image.getSrcKey();

    /** The resolver's answer for an image carrying nothing renderable. */
    private static final Function<AppImage, String> NO_URLS = _ -> null;

    /** The mode every case below mints under; only SPOT_THE_ANSWER changes what is minted. */
    private static final FollowUpMode VOTE = FollowUpMode.BEST_ANSWER_VOTE;

    /** The one mode that seeds the parent's authored answer into the board. */
    private static final FollowUpMode SPOT = FollowUpMode.SPOT_THE_ANSWER;

    @Test
    void mcqParentMintsTheAuthoredChoicesVerbatimAndInOrder() {
        Slide parent = slideWith(mcq(
                option("opt-a", "Alpha", null),
                option("opt-b", "Beta", null)));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new McqAnswer(Set.of("opt-a")), 100)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.optionId()).containsExactly("opt-a", "opt-b");
        assertThat(options).extracting(option -> option.text()).containsExactly("Alpha", "Beta");
        assertThat(options).allSatisfy(o -> assertThat(o.authorParticipantIds()).isEmpty());
        assertThat(options).allSatisfy(o -> assertThat(o.imageUrl()).isNull());
    }

    @Test
    void mcqImageChoiceResolvesItsUrl() {
        Slide parent = slideWith(mcq(option("opt-a", null, image("s3/alpha.png"))));

        FollowUpOption minted = FollowUpOptions.mint(parent, List.of(), VOTE, URLS).options().get(0);

        assertThat(minted.imageUrl()).isEqualTo("https://cdn/s3/alpha.png");
    }

    @Test
    void textParentMergesCaseAndWhitespaceVariantsAndUnionsAuthors() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Paris"), 100),
                answer("p-2", new TextAnswer("  paris "), 200),
                answer("p-3", new TextAnswer("Lyon"), 300)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris", "Lyon");
        assertThat(options.get(0).authorParticipantIds()).containsExactlyInAnyOrder("p-1", "p-2");
        assertThat(options.get(1).authorParticipantIds()).containsExactly("p-3");
    }

    @Test
    void caseSensitiveParentKeepsTheVariantsApart() {
        Slide parent = slideWith(text(true, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Paris"), 100),
                answer("p-2", new TextAnswer(" paris "), 200)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris", " paris ");
    }

    @Test
    void earliestRawSubmissionSuppliesTheMergedGroupsDisplayText() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-2", new TextAnswer("PARIS"), 500),
                answer("p-1", new TextAnswer("Paris"), 100)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Paris");
    }

    @Test
    void blankAndNonTextSubmissionsAreDropped() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("   "), 100),
                answer("p-2", new TextAnswer(null), 200),
                answer("p-3", new McqAnswer(Set.of("opt-a")), 300),
                answer("p-4", new TextAnswer("Lyon"), 400)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Lyon");
        assertThat(options.get(0).authorParticipantIds()).containsExactly("p-4");
    }

    @Test
    void textOptionsAreOrderedBySubmissionThenParticipantId() {
        Slide parent = slideWith(text(false, true));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-b", new TextAnswer("second"), 200),
                answer("p-c", new TextAnswer("tie-late"), 100),
                answer("p-a", new TextAnswer("tie-early"), 100)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text())
                .containsExactly("tie-early", "tie-late", "second");
    }

    @Test
    void drawingParentMintsOneOptionPerSubmittedImage() {
        Slide parent = slideWith(drawing());

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(null), 200),
                answer("p-3", new DrawingAnswer(image("s3/three.png")), 300)), VOTE, URLS).options();

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

        FollowUpOptionSet first = FollowUpOptions.mint(parent, answers, VOTE, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.copyOf(answers), VOTE, URLS);

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

        FollowUpOptionSet first = FollowUpOptions.mint(parent, List.of(parisEarly, lyon, parisLate), VOTE, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.of(parisLate, parisEarly, lyon), VOTE, URLS);

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

        FollowUpOptionSet first = FollowUpOptions.mint(parent, List.of(one, two, duplicateOfOne), VOTE, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, List.of(duplicateOfOne, one, two), VOTE, URLS);

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
                List.of(nullSubmittedAtAndParticipant, nullSubmittedAt, first), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text())
                .containsExactly("first", "null-submitted-at", "null-participant");
    }

    @ParameterizedTest
    @MethodSource("parentsWithoutFollowUpOptions")
    void parentWithoutFollowUpOptionsMintsNothing(Slide parent) {
        assertThat(FollowUpOptions.mint(parent, List.of(), VOTE, URLS).options()).isEmpty();
    }

    static Stream<Arguments> parentsWithoutFollowUpOptions() {
        return Stream.of(
                Arguments.of(slideWith(new QAndAContent(null, false))),
                Arguments.of((Slide) null));
    }

    @ParameterizedTest
    @MethodSource("optionLookups")
    void byIdReturnsWhetherTheOptionExists(FollowUpOptionSet set, String optionId, boolean exists) {
        assertThat(set.byId(optionId) != null).isEqualTo(exists);
    }

    static Stream<Arguments> optionLookups() {
        FollowUpOptionSet set = FollowUpOptions.mint(
                slideWith(mcq(option("opt-a", "Alpha", null))), List.of(), VOTE, URLS);

        return Stream.of(
                Arguments.of(set, "opt-a", true),
                Arguments.of(set, "nope", false),
                Arguments.of(FollowUpOptionSet.empty(), "opt-a", false));
    }

    // ── SPOT_THE_ANSWER seeding ────────────────────────────────────────────────

    @Test
    void spotTheAnswerSeedsTheParentsAuthoredAnswerAmongTheSubmissions() {
        Slide parent = slideWith(keyedText("Paris"));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200)), SPOT, URLS).options();

        assertThat(options).extracting(option -> option.text())
                .containsExactlyInAnyOrder("Paris", "Lyon", "Nice");
        assertThat(options).filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> {
                    assertThat(seed.text()).isEqualTo("Paris");
                    // Nobody submitted it, so it stands for no participant — which
                    // is also what stops the self-pick guard from firing on it.
                    assertThat(seed.authorParticipantIds()).isEmpty();
                });
    }

    @Test
    void spotTheAnswerMergesAMatchingSubmissionIntoTheSeededCard() {
        Slide parent = slideWith(keyedText("Paris"));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer(" paris "), 100),
                answer("p-2", new TextAnswer("PARIS"), 200)), SPOT, URLS).options();

        // One card, not two: the submitters' wording normalizes onto the key, so
        // the answer and their submission are the same candidate.
        assertThat(options).singleElement().satisfies(card -> {
            assertThat(card.text()).isEqualTo(" paris ");
            assertThat(card.authoredAnswer()).isTrue();
            assertThat(card.authorParticipantIds()).containsExactlyInAnyOrder("p-1", "p-2");
        });
    }

    @Test
    void spotTheAnswerSeedsOneRepresentativeOfAMultiEntryAnswerKey() {
        // Accepted answers hydrate as a LinkedHashSet, so "first non-blank in
        // iteration order" is the authored order — one card, not three.
        Slide parent = slideWith(keyedText("   ", "Paris", "Paree"));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Lyon"), 100)), SPOT, URLS).options();

        assertThat(options).hasSize(2);
        assertThat(options).filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> assertThat(seed.text()).isEqualTo("Paris"));
    }

    @ParameterizedTest
    @MethodSource("textParentsWithoutUsableAnswerKeys")
    void spotTheAnswerOnAParentWithoutAUsableAnswerKeyMintsTheVoteBoardWithNothingFlagged(Slide parent) {
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200));

        List<FollowUpOption> degraded = FollowUpOptions.mint(parent, answers, SPOT, URLS).options();
        List<FollowUpOption> asVote = FollowUpOptions.mint(parent, answers, VOTE, URLS).options();

        assertThat(degraded).containsExactlyInAnyOrderElementsOf(asVote);
        assertThat(degraded).noneMatch(option -> option.authoredAnswer());
    }

    static Stream<Slide> textParentsWithoutUsableAnswerKeys() {
        return Stream.of(
                slideWith(keyedText()),
                slideWith(keyedText("   ")));
    }

    @Test
    void spotTheAnswerShufflesTheKeylessDegradedBoard() {
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200),
                answer("p-3", new TextAnswer("Dijon"), 300));

        FollowUpOptionSet board = FollowUpOptions.mint(
                slideWith(keyedText()), answers, SPOT, URLS, Collections::reverse);

        assertThat(board.options()).extracting(FollowUpOption::text)
                .containsExactly("Dijon", "Nice", "Lyon");
    }

    @Test
    void bestAnswerVoteNeverSeedsTheAnswerEvenOnAKeyedParent() {
        Slide parent = slideWith(keyedText("Paris"));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Lyon"), 100)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.text()).containsExactly("Lyon");
        assertThat(options).noneMatch(option -> option.authoredAnswer());
    }

    @Test
    void spotTheAnswerRemintReproducesTheSameCandidateIdsIfNotTheirOrder() {
        Slide parent = slideWith(keyedText("Paris"));
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200),
                answer("p-3", new TextAnswer("Dijon"), 300));

        FollowUpOptionSet first = FollowUpOptions.mint(parent, answers, SPOT, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, answers, SPOT, URLS);

        // Ids are content-derived, so a re-mint stands for exactly the same cards
        // — the board is shuffled, which nothing addresses a candidate by.
        assertThat(second.options()).containsExactlyInAnyOrderElementsOf(first.options());
    }

    @Test
    void spotTheAnswerHandsTheWholeBoardToTheShuffler() {
        Slide parent = slideWith(keyedText("Paris"));
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200),
                answer("p-3", new TextAnswer("Dijon"), 300));

        FollowUpOptionSet board = FollowUpOptions.mint(parent, answers, SPOT, URLS, options -> {
            Collections.swap(options, 0, 2);
            Collections.swap(options, 1, 3);
        });

        assertThat(board.options()).extracting(FollowUpOption::text)
                .containsExactly("Dijon", "Paris", "Lyon", "Nice");
        assertThat(board.options().get(1).authoredAnswer()).isTrue();
    }

    @Test
    void seededCardObeysTheSameIdToTextRelationAsEverySubmittedCard() {
        // A parent that does NOT trim: keying the seed off the raw accepted answer
        // would leave it as the one card whose id isn't derivedId(normalize(text)),
        // which is a tell as good as a label. It is stripped before keying instead.
        TextContent content = new TextContent(answerKey("  Paris  "), MatchMode.EXACT, false, false, null);
        Slide parent = slideWith(content);

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Paris"), 200)), SPOT, URLS).options();

        assertThat(options).allSatisfy(option -> assertThat(option.optionId())
                .isEqualTo(derivedId(content.normalize(option.text()))));
        // …and the submission that matches the stripped answer still merges into it.
        assertThat(options).filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> assertThat(seed.authorParticipantIds()).containsExactly("p-2"));
        assertThat(options).hasSize(2);
    }

    // ── SPOT_THE_ANSWER on a DRAWING parent (the image twin) ──────────────────

    @Test
    void spotTheAnswerSeedsTheParentsAuthoredImageAmongTheSubmittedDrawings() {
        Slide parent = slideWith(keyedDrawing(image("gallery/answer.png")));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(image("s3/two.png")), 200)), SPOT, URLS).options();

        assertThat(options).extracting(option -> option.imageUrl())
                .containsExactlyInAnyOrder("https://cdn/gallery/answer.png",
                        "https://cdn/s3/one.png", "https://cdn/s3/two.png");
        assertThat(options).filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> {
                    // Resolved through the same function every submitted card
                    // goes through, so it leaves opaque like the rest of them.
                    assertThat(seed.imageUrl()).isEqualTo("https://cdn/gallery/answer.png");
                    assertThat(seed.text()).isNull();
                    // Nobody drew it, so it stands for no participant — which is
                    // also what stops the self-pick guard from firing on it.
                    assertThat(seed.authorParticipantIds()).isEmpty();
                });
    }

    @Test
    void seededImageCardIsKeyedOnItsSrcKeyLikeEverySubmittedDrawing() {
        Slide parent = slideWith(keyedDrawing(image("gallery/answer.png")));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100)), SPOT, URLS).options();

        // The id relation a re-mint depends on, and the one that keeps the seed
        // from being the single card whose id isn't derived from its content.
        assertThat(options).filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> assertThat(seed.optionId()).isEqualTo(derivedId("gallery/answer.png")));
        assertThat(options).filteredOn(option -> !option.authoredAnswer())
                .singleElement()
                .satisfies(card -> assertThat(card.optionId()).isEqualTo(derivedId("s3/one.png")));
    }

    @Test
    void spotTheAnswerOnADrawingParentWithNoAuthoredImageMintsTheVoteBoardWithNothingFlagged() {
        // Same degradation as the text twin: the editor rejects clearing the
        // image under an attached child, but a deck snapshot can predate it.
        List<Answer> answers = List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(image("s3/two.png")), 200));

        List<FollowUpOption> degraded = FollowUpOptions.mint(
                slideWith(keyedDrawing(null)), answers, SPOT, URLS).options();
        List<FollowUpOption> asVote = FollowUpOptions.mint(
                slideWith(keyedDrawing(null)), answers, VOTE, URLS).options();

        assertThat(degraded).containsExactlyInAnyOrderElementsOf(asVote);
        assertThat(degraded).noneMatch(option -> option.authoredAnswer());
    }

    @Test
    void anExternalCorrectImageIsNotSeeded() {
        // An external image owns no stored object, so it can't be served through
        // the opaque proxy every candidate goes out behind — being the one card
        // on someone else's origin would be the tell the proxy exists to remove.
        Slide parent = slideWith(keyedDrawing(externalImage("https://elsewhere/answer.png")));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100)), SPOT, URLS).options();

        assertThat(options).singleElement()
                .satisfies(card -> assertThat(card.imageUrl()).isEqualTo("https://cdn/s3/one.png"));
        assertThat(options).noneMatch(option -> option.authoredAnswer());
    }

    @Test
    void aCorrectImageWithNoRenderableVariantIsNotSeeded() {
        // The resolver hands back null for an image carrying nothing renderable;
        // a card with no picture on an image board is worse than no card.
        Slide parent = slideWith(keyedDrawing(image("gallery/answer.png")));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100)), SPOT, NO_URLS).options();

        assertThat(options).singleElement()
                .satisfies(card -> assertThat(card.authoredAnswer()).isFalse());
    }

    @Test
    void bestAnswerVoteNeverSeedsTheAnswerImageEvenOnAKeyedDrawingParent() {
        Slide parent = slideWith(keyedDrawing(image("gallery/answer.png")));

        List<FollowUpOption> options = FollowUpOptions.mint(parent, List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100)), VOTE, URLS).options();

        assertThat(options).extracting(option -> option.imageUrl()).containsExactly("https://cdn/s3/one.png");
        assertThat(options).noneMatch(option -> option.authoredAnswer());
    }

    @Test
    void spotTheAnswerRemintOverDrawingsReproducesTheSameCandidateIdsIfNotTheirOrder() {
        Slide parent = slideWith(keyedDrawing(image("gallery/answer.png")));
        List<Answer> answers = List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(image("s3/two.png")), 200),
                answer("p-3", new DrawingAnswer(image("s3/three.png")), 300));

        FollowUpOptionSet first = FollowUpOptions.mint(parent, answers, SPOT, URLS);
        FollowUpOptionSet second = FollowUpOptions.mint(parent, answers, SPOT, URLS);

        // Same cards — ids are content-derived — in an arrangement nothing
        // addresses a candidate by.
        assertThat(second.options()).containsExactlyInAnyOrderElementsOf(first.options());
    }

    @Test
    void spotTheAnswerShufflesADrawingBoardWithOrWithoutAnAuthoredImage() {
        List<Answer> answers = List.of(
                answer("p-1", new DrawingAnswer(image("s3/one.png")), 100),
                answer("p-2", new DrawingAnswer(image("s3/two.png")), 200),
                answer("p-3", new DrawingAnswer(image("s3/three.png")), 300));

        FollowUpOptionSet seeded = FollowUpOptions.mint(
                slideWith(keyedDrawing(image("gallery/answer.png"))), answers, SPOT, URLS, Collections::reverse);
        FollowUpOptionSet degraded = FollowUpOptions.mint(
                slideWith(keyedDrawing(null)), answers, SPOT, URLS, Collections::reverse);

        assertThat(seeded.options()).extracting(FollowUpOption::imageUrl)
                .containsExactly("https://cdn/gallery/answer.png", "https://cdn/s3/three.png",
                        "https://cdn/s3/two.png", "https://cdn/s3/one.png");
        assertThat(degraded.options()).extracting(FollowUpOption::imageUrl)
                .containsExactly("https://cdn/s3/three.png", "https://cdn/s3/two.png", "https://cdn/s3/one.png");
    }

    // ── fixtures ───────────────────────────────────────────────────────────────

    /** The id the mint derives for a candidate keyed on {@code key}. */
    private static String derivedId(String key) {
        return UUID.nameUUIDFromBytes(key.getBytes(StandardCharsets.UTF_8)).toString();
    }

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

    /** A trimming, case-insensitive TEXT parent carrying the given answer key. */
    private static TextContent keyedText(String... acceptedAnswers) {
        return new TextContent(answerKey(acceptedAnswers), MatchMode.EXACT, false, true, null);
    }

    /** An answer key preserving authored order, as a stored {@code Set} hydrates. */
    private static Set<String> answerKey(String... acceptedAnswers) {
        return new LinkedHashSet<>(List.of(acceptedAnswers));
    }

    private static DrawingContent drawing() {
        return new DrawingContent(null, PromptPlacement.ALONGSIDE, null, List.of(), Set.of());
    }

    /** A DRAWING parent carrying (or not) the authored answer SPOT_THE_ANSWER seeds. */
    private static DrawingContent keyedDrawing(AppImage correctImage) {
        return new DrawingContent(null, PromptPlacement.ALONGSIDE, correctImage, List.of(), Set.of());
    }

    private static AppImage image(String srcKey) {
        AppImage image = new AppImage();
        image.setSrcKey(srcKey);
        return image;
    }

    /** An image on someone else's origin — no stored object to serve opaquely. */
    private static AppImage externalImage(String url) {
        AppImage image = new AppImage();
        image.setExternal(true);
        image.setExternalSrc(url);
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
