package com.cephadex.ambi.session.followUp;

import static org.assertj.core.api.Assertions.assertThat;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;
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
 * {@code SPOT_THE_ANSWER} seeding — which card carries the flag, how a matching
 * submission merges into it, that its id obeys the same id↔text relation every
 * submitted card does, and that the board it lands on is shuffled rather than
 * laid out in any order a client could reconstruct or diff.
 */
class FollowUpOptionsTest {

    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");
    private static final Function<AppImage, String> URLS = image -> "https://cdn/" + image.getSrcKey();

    /** The mode every case below mints under; only SPOT_THE_ANSWER changes what is minted. */
    private static final FollowUpMode VOTE = FollowUpMode.BEST_ANSWER_VOTE;

    /** The one mode that seeds the parent's authored answer into the board. */
    private static final FollowUpMode SPOT = FollowUpMode.SPOT_THE_ANSWER;

    /** Repeats behind the shuffle case below — see its false-failure bound. */
    private static final int MINTS = 100;

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

    @Test
    void unsupportedParentKindAndNoParentMintNothing() {
        assertThat(FollowUpOptions.mint(slideWith(new QAndAContent(null, false)), List.of(), VOTE, URLS).options())
                .isEmpty();
        assertThat(FollowUpOptions.mint(null, List.of(), VOTE, URLS).options()).isEmpty();
    }

    @Test
    void byIdFindsAMintedOptionAndReturnsNullOtherwise() {
        FollowUpOptionSet set = FollowUpOptions.mint(
                slideWith(mcq(option("opt-a", "Alpha", null))), List.of(), VOTE, URLS);

        assertThat(set.byId("opt-a")).isNotNull();
        assertThat(set.byId("nope")).isNull();
        assertThat(FollowUpOptionSet.empty().byId("opt-a")).isNull();
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

    @Test
    void spotTheAnswerOnAParentWithNoAnswerKeyMintsTheVoteBoardWithNothingFlagged() {
        // The editor rejects emptying the key under an attached SPOT_THE_ANSWER
        // child, but a live session's deck snapshot can predate that rule.
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200));

        List<FollowUpOption> degraded = FollowUpOptions.mint(
                slideWith(keyedText()), answers, SPOT, URLS).options();
        List<FollowUpOption> blankKey = FollowUpOptions.mint(
                slideWith(keyedText("   ")), answers, SPOT, URLS).options();
        List<FollowUpOption> asVote = FollowUpOptions.mint(
                slideWith(keyedText()), answers, VOTE, URLS).options();

        // Same cards, not necessarily the same arrangement: a SPOT_THE_ANSWER
        // mint shuffles its board whether or not it had a key to seed, so only
        // the vote board's *set* of candidates is what "mints as VOTE" means.
        assertThat(degraded).containsExactlyInAnyOrderElementsOf(asVote);
        assertThat(blankKey).containsExactlyInAnyOrderElementsOf(asVote);
        assertThat(degraded).noneMatch(option -> option.authoredAnswer());
    }

    @Test
    void spotTheAnswerShufflesEvenTheKeylessDegradedBoard() {
        // The shuffle must be unconditional: a keyless SPOT_THE_ANSWER board that
        // kept submission order would itself tell the room no card is correct —
        // "did the board shuffle?" must not leak whether a key exists. Pins the
        // property against a future "only shuffle when we seeded" optimization.
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200),
                answer("p-3", new TextAnswer("Dijon"), 300));

        Set<List<String>> arrangements = new LinkedHashSet<>();
        for (int mint = 0; mint < MINTS; mint++) {
            arrangements.add(submittedTexts(
                    FollowUpOptions.mint(slideWith(keyedText()), answers, SPOT, URLS)));
        }

        // Three cards, uniform over 6 permutations: a constant arrangement —
        // what an unshuffled degraded mint would give — has probability
        // 6 · (1/6)^100 = (1/6)^99.
        assertThat(arrangements).hasSizeGreaterThan(1);
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
    void spotTheAnswerShufflesTheWholeBoardSoTwoMintsShareNoArrangement() {
        // The regression: hiding the seed in one random slot while the submissions
        // kept submission order left two mints of an unchanged round differing in
        // exactly ONE card's index — so a participant diffing the live board
        // against a refetched snapshot read the seed off as "the card that moved".
        // The fix shuffles the whole list, so the two arrangements are independent
        // permutations: the seed moves, and so does everything else.
        Slide parent = slideWith(keyedText("Paris"));
        List<Answer> answers = List.of(
                answer("p-1", new TextAnswer("Lyon"), 100),
                answer("p-2", new TextAnswer("Nice"), 200),
                answer("p-3", new TextAnswer("Dijon"), 300));

        Set<Integer> seedSlots = new LinkedHashSet<>();
        Set<List<String>> submittedOrders = new LinkedHashSet<>();
        for (int mint = 0; mint < MINTS; mint++) {
            FollowUpOptionSet board = FollowUpOptions.mint(parent, answers, SPOT, URLS);
            List<FollowUpOption> options = board.options();
            seedSlots.add(options.indexOf(options.stream()
                    .filter(option -> option.authoredAnswer()).findFirst().orElseThrow()));
            submittedOrders.add(submittedTexts(board));
        }

        // A four-card board (three submissions + the seed), minted MINTS = 100
        // times. The seed's slot is uniform over 4, so a constant one — which is
        // what a derived slot would give — has probability 4 · (1/4)^100 =
        // (1/4)^99.
        assertThat(seedSlots).hasSizeGreaterThan(1);
        // …and the submissions' order among themselves is uniform over its 6
        // permutations, so it staying constant — which is what insert-at-a-slot
        // gave, and what made the diff work — has probability 6 · (1/6)^100 =
        // (1/6)^99. Union bound on this test failing against a correct shuffle:
        // (1/4)^99 + (1/6)^99 < 2 · 10^-59.
        assertThat(submittedOrders).hasSizeGreaterThan(1);
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

    // ── fixtures ───────────────────────────────────────────────────────────────

    /** The board's submitted cards in board order — the seed dropped out. */
    private static List<String> submittedTexts(FollowUpOptionSet set) {
        return set.options().stream()
                .filter(option -> !option.authoredAnswer())
                .map(option -> option.text())
                .toList();
    }

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
