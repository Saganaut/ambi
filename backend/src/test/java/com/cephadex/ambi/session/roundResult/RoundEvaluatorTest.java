package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.entry;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.SessionTypes.ParticipantOutcome;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.PlaceOnImageAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.answer.payload.RankingAnswer;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

/**
 * Grading: each answer is compared against the slide's typed content key, exactly
 * one fastest-correct is flagged, and content with no static key never grades true.
 * A follow-up pick is the exception whose key is the round's minted board — only
 * {@code SPOT_THE_ANSWER} has one — and the author side of that mode, where a
 * card's picks pay its writers and are not zeroed by their own correct grade.
 */
class RoundEvaluatorTest {

    private static final Instant START = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void gradesMcqAsExactSetMatch() {
        Slide slide = slideWith(mcq(Set.of("a", "b")));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("p1", new McqAnswer(Set.of("a", "b")), 100),
                answer("p2", new McqAnswer(Set.of("a")), 200)), START);

        assertThat(evals.get(0).correct()).isTrue();
        assertThat(evals.get(1).correct()).isFalse();
    }

    @Test
    void flagsExactlyOneFastestCorrect() {
        Slide slide = slideWith(mcq(Set.of("a")));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("slow", new McqAnswer(Set.of("a")), 500),
                answer("fast", new McqAnswer(Set.of("a")), 100)), START);

        assertThat(evals.get(0).fastestCorrect()).isFalse();
        assertThat(evals.get(1).fastestCorrect()).isTrue();
    }

    @Test
    void gradesNumberExactAndRangeAndRejectsUnscored() {
        Slide exact = slideWith(new NumberContent(new BigDecimal("42"), ScoreMode.EXACT, null, null, null, null));
        assertThat(gradeOne(exact, new NumberAnswer(42))).isTrue();
        assertThat(gradeOne(exact, new NumberAnswer(41))).isFalse();

        Slide range = slideWith(
                new NumberContent(new BigDecimal("42"), ScoreMode.RANGE, new BigDecimal("2"), null, null, null));
        assertThat(gradeOne(range, new NumberAnswer(43))).isTrue();
        assertThat(gradeOne(range, new NumberAnswer(45))).isFalse();

        // A null answer marks an unscored collect-only slide: nothing grades correct.
        Slide unscored = slideWith(new NumberContent(null, ScoreMode.EXACT, null, null, null, null));
        assertThat(gradeOne(unscored, new NumberAnswer(42))).isFalse();
    }

    @Test
    void gradesTextNormalizedAndRejectsWordcloud() {
        Slide accepts = slideWith(new TextContent(Set.of("Frodo"), MatchMode.EXACT, false, true, null));
        assertThat(gradeOne(accepts, new TextAnswer(" frodo "))).isTrue();
        assertThat(gradeOne(accepts, new TextAnswer("Sam"))).isFalse();

        Slide wordcloud = slideWith(new TextContent(Set.of(), MatchMode.WORDCLOUD, false, true, null));
        assertThat(gradeOne(wordcloud, new TextAnswer("anything"))).isFalse();
    }

    @Test
    void gradesAxisAllOrNothingInsideTolerance() {
        // Two targets, tolerance 0.1: every keyed item must land within radius.
        Slide slide = slideWith(axis(
                Map.of("it-1", new AxisPoint(0.2, 0.2), "it-2", new AxisPoint(0.8, 0.8)), 0.1));

        // Both inside (0.05 off on one coordinate each).
        assertThat(gradeOne(slide, new AxisAnswer(Map.of(
                "it-1", new AxisPoint(0.25, 0.2), "it-2", new AxisPoint(0.8, 0.75))))).isTrue();
        // One item outside tolerance fails the whole answer.
        assertThat(gradeOne(slide, new AxisAnswer(Map.of(
                "it-1", new AxisPoint(0.25, 0.2), "it-2", new AxisPoint(0.5, 0.5))))).isFalse();
        // A keyed item missing from the placements fails.
        assertThat(gradeOne(slide, new AxisAnswer(Map.of(
                "it-1", new AxisPoint(0.2, 0.2))))).isFalse();
        // Distance is Euclidean in normalized space: 0.08 on both axes is ~0.113 > 0.1.
        assertThat(gradeOne(slide, new AxisAnswer(Map.of(
                "it-1", new AxisPoint(0.28, 0.28), "it-2", new AxisPoint(0.8, 0.8))))).isFalse();
    }

    @Test
    void axisWithEmptyAnswerKeyIsCollectOnlyAndNeverGradesCorrect() {
        Slide slide = slideWith(axis(Map.of(), 0.1));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new AxisAnswer(Map.of("it-1", new AxisPoint(0.5, 0.5))), 10)), START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // map-shaped: not tallied as a single choice
    }

    @Test
    void gradesPlaceOnImageAllOrNothingEachInsideItsOwnRadius() {
        // Two targets, each with its own radius: every item's pin must land
        // inside that item's target circle (not merely inside any circle).
        Slide slide = slideWith(place(
                new Target("it-1", "One", null, null, 0.2, 0.2, 0.1),
                new Target("it-2", "Two", null, null, 0.8, 0.8, 0.05)));

        // Both inside their own radius.
        assertThat(gradeOne(slide, new PlaceOnImageAnswer(Map.of(
                "it-1", new PlacePoint(0.25, 0.2), "it-2", new PlacePoint(0.8, 0.82))))).isTrue();
        // it-2 lands inside it-1's larger radius but outside its OWN smaller one → fails.
        assertThat(gradeOne(slide, new PlaceOnImageAnswer(Map.of(
                "it-1", new PlacePoint(0.2, 0.2), "it-2", new PlacePoint(0.72, 0.8))))).isFalse();
        // A keyed item missing from the placements fails.
        assertThat(gradeOne(slide, new PlaceOnImageAnswer(Map.of(
                "it-1", new PlacePoint(0.2, 0.2))))).isFalse();
    }

    @Test
    void placeOnImageWithNoTargetsIsCollectOnlyAndNeverGradesCorrect() {
        Slide slide = slideWith(new PlaceOnImageContent(null, List.of(), ScoreMode.INSIDE_RADIUS));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new PlaceOnImageAnswer(Map.of("it-1", new PlacePoint(0.5, 0.5))), 10)),
                START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // map-shaped: not tallied as a single choice
    }

    @Test
    void gradesScalesAllOrNothingWithinTolerance() {
        // Scale 1–5 (span 4), tolerance 1 in scale units. Targets are in scale
        // units; answers arrive as normalized positions and are denormalized.
        Slide slide = slideWith(scales(Map.of("st-1", 4.0, "st-2", 2.0), 1.0));

        // st-1 target 4 → position 0.75; st-2 target 2 → position 0.25. Exact hits.
        assertThat(gradeOne(slide, new ScalesAnswer(Map.of("st-1", 0.75, "st-2", 0.25)))).isTrue();
        // Boundary: exactly ± tolerance still counts. Target 4 ± 1 = [3, 5];
        // position 0.5 → value 3.0, the low edge.
        assertThat(gradeOne(slide, new ScalesAnswer(Map.of("st-1", 0.5, "st-2", 0.25)))).isTrue();
        // Just outside: position 0.4 → value 2.6, which is 1.4 from target 4 > 1.
        assertThat(gradeOne(slide, new ScalesAnswer(Map.of("st-1", 0.4, "st-2", 0.25)))).isFalse();
        // A keyed statement missing from the positions fails the whole answer.
        assertThat(gradeOne(slide, new ScalesAnswer(Map.of("st-1", 0.75)))).isFalse();
    }

    @Test
    void scalesWithEmptyAnswerKeyIsCollectOnlyAndNeverGradesCorrect() {
        Slide slide = slideWith(scales(Map.of(), 1.0));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new ScalesAnswer(Map.of("st-1", 0.5)), 10)), START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // map-shaped: not tallied as a single choice
    }

    @Test
    void gradesMatchingAsExactMapMatch() {
        Slide slide = slideWith(matching(Map.of("left-1", "right-1", "left-2", "right-2")));

        // The exact map (any entry order) grades true.
        assertThat(gradeOne(slide, new MatchingAnswer(Map.of("left-2", "right-2", "left-1", "right-1")))).isTrue();
        // One swapped pair fails the whole answer (EXACT, all-or-nothing).
        assertThat(gradeOne(slide, new MatchingAnswer(Map.of("left-1", "right-2", "left-2", "right-1")))).isFalse();
        // A partial map (a keyed left card unmatched) fails too.
        assertThat(gradeOne(slide, new MatchingAnswer(Map.of("left-1", "right-1")))).isFalse();
    }

    @Test
    void matchingWithEmptyAnswerKeyIsCollectOnlyAndNeverGradesCorrect() {
        Slide slide = slideWith(matching(Map.of()));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new MatchingAnswer(Map.of("left-1", "right-1")), 10)), START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // map-shaped: not tallied as a single choice
    }

    @Test
    void gradesGridAsExactMatchOfTheFullKey() {
        Slide slide = slideWith(grid(Map.of("it-1", "0,0", "it-2", "1,1", "it-3", "0,1")));

        assertThat(gradeOne(slide, new GridAnswer(Map.of("it-1", "0,0", "it-2", "1,1", "it-3", "0,1")))).isTrue();
        // One item in the wrong cell fails the whole answer (EXACT, all-or-nothing).
        assertThat(gradeOne(slide, new GridAnswer(Map.of("it-1", "0,0", "it-2", "0,1", "it-3", "1,1")))).isFalse();
    }

    @Test
    void gradesGridCorrectWhenEveryKeyedItemIsPlacedRight() {
        // A partial key: the editor keys only the items it placed, while the
        // board makes players place every item, so placements for unkeyed items
        // are ignored rather than failing the answer.
        Slide slide = slideWith(grid(Map.of("it-1", "0,0", "it-2", "1,1")));

        assertThat(gradeOne(slide, new GridAnswer(Map.of(
                "it-1", "0,0", "it-2", "1,1", "it-3", "1,0")))).isTrue();
    }

    @Test
    void gridFailsWhenAKeyedItemIsMisplacedOrMissing() {
        Slide slide = slideWith(grid(Map.of("it-1", "0,0", "it-2", "1,1")));

        // A keyed item in the wrong cell fails, however the unkeyed items land.
        assertThat(gradeOne(slide, new GridAnswer(Map.of(
                "it-1", "0,0", "it-2", "0,1", "it-3", "1,0")))).isFalse();
        // A keyed item missing from the placements fails.
        assertThat(gradeOne(slide, new GridAnswer(Map.of("it-1", "0,0", "it-3", "1,0")))).isFalse();
    }

    @Test
    void gridWithEmptyAnswerKeyIsCollectOnlyAndNeverGradesCorrect() {
        Slide slide = slideWith(grid(Map.of()));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new GridAnswer(Map.of("it-1", "0,0")), 10)), START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // map-shaped: not tallied as a single choice
    }

    @Test
    void gradesRankingAsExactOrderMatch() {
        Slide slide = slideWith(ranking(List.of("it-1", "it-2", "it-3")));

        // The exact order grades true.
        assertThat(gradeOne(slide, new RankingAnswer(List.of("it-1", "it-2", "it-3")))).isTrue();
        // Any swapped pair fails the whole ordering (EXACT, all-or-nothing).
        assertThat(gradeOne(slide, new RankingAnswer(List.of("it-2", "it-1", "it-3")))).isFalse();
    }

    @Test
    void followUpPickNeverGradesCorrectButTalliesAsTheChoice() {
        Slide slide = slideWith(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new FollowUpAnswer("opt-a"), 10)), START).get(0);

        // v1 has no answer key on a follow-up board, but the pick IS the round's
        // answer, so the candidate's option id collates as the tally choice.
        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isEqualTo("opt-a");
    }

    @Test
    void followUpRoundCountsPicksPerOption() {
        Slide slide = slideWith(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("p1", new FollowUpAnswer("opt-a"), 100),
                answer("p2", new FollowUpAnswer("opt-b"), 200),
                answer("p3", new FollowUpAnswer("opt-a"), 300)), START);

        RoundResult result = RoundResult.compute("session-1", slide, evals.stream()
                .map(eval -> new ParticipantOutcome(eval.participantId(), eval.choice(), eval.correct(), 0,
                        eval.responseTimeMs()))
                .toList(), START);

        assertThat(result.optionCounts()).containsOnly(entry("opt-a", 2), entry("opt-b", 1));
    }

    @Test
    void correctKeyIsNullForAFollowUpSlide() {
        // No static answer key: a follow-up board's candidates are minted at
        // runtime, so the reveal has no correct option to line the tally up with.
        assertThat(RoundEvaluator.correctKey(slideWith(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE))))
                .isNull();
    }

    @Test
    void qandaAggregateNeverGradesCorrect() {
        Slide slide = slideWith(new QAndAContent(null, false));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new QAndAQuestions(
                        List.of(new QAndAQuestions.QuestionEntry("q-1", "Why?", START))), 10)),
                START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // free-form: not tallied
    }

    // ── vote fold-in (best-answer / deception, D3) ───────────────────────────

    @Test
    void withoutVotesNoBestAnswerIsFlaggedAndNobodyDeceives() {
        Slide slide = slideWith(new TextContent(Set.of("Frodo"), MatchMode.EXACT, false, true, null));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("p1", new TextAnswer("Frodo"), 100),
                answer("p2", new TextAnswer("Sam"), 200)), START);

        assertThat(evals).allSatisfy(eval -> {
            assertThat(eval.bestAnswer()).isFalse();
            assertThat(eval.deceivedCount()).isZero();
        });
    }

    @Test
    void flagsTheTopVotedAnswerAsBestAndCountsDeceivedVoters() {
        Slide slide = slideWith(new TextContent(Set.of("Frodo"), MatchMode.EXACT, false, true, null));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("truth", new TextAnswer("Frodo"), 100),
                answer("liar", new TextAnswer("Sam"), 200),
                answer("dud", new TextAnswer("Merry"), 300)),
                START, Map.of("liar", 3, "truth", 2));

        // The top-voted answer is best regardless of correctness; every vote for
        // an incorrect answer is a deceived voter, votes for the truth deceive nobody.
        assertThat(evals.get(0).bestAnswer()).isFalse();
        assertThat(evals.get(0).deceivedCount()).isZero();
        assertThat(evals.get(1).bestAnswer()).isTrue();
        assertThat(evals.get(1).deceivedCount()).isEqualTo(3);
        assertThat(evals.get(2).bestAnswer()).isFalse();
        assertThat(evals.get(2).deceivedCount()).isZero();
    }

    @Test
    void bestAnswerVoteTieGoesToTheFasterSubmission() {
        Slide slide = slideWith(new TextContent(Set.of(), MatchMode.EXACT, false, true, null));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("slow", new TextAnswer("one"), 500),
                answer("fast", new TextAnswer("two"), 100)),
                START, Map.of("slow", 2, "fast", 2));

        assertThat(evals.get(0).bestAnswer()).isFalse();
        assertThat(evals.get(1).bestAnswer()).isTrue();
    }

    // ── SPOT_THE_ANSWER (the follow-up grade + the author side) ──────────────

    @Test
    void spotTheAnswerGradesAPickOfTheSeededCandidateCorrect() {
        assertThat(gradePick(FollowUpMode.SPOT_THE_ANSWER, board(), "seed")).isTrue();
    }

    @Test
    void spotTheAnswerGradesAPickOfAnyOtherCandidateFalse() {
        assertThat(gradePick(FollowUpMode.SPOT_THE_ANSWER, board(), "opt-a")).isFalse();
        // A pick naming a candidate the board never had grades false too, rather
        // than failing the round.
        assertThat(gradePick(FollowUpMode.SPOT_THE_ANSWER, board(), "ghost")).isFalse();
    }

    @Test
    void otherFollowUpModesGradeFalseEvenAgainstASeededBoard() {
        // "Which was best?" and "which was most popular?" have no right answer,
        // so the flag on the board is irrelevant to them.
        assertThat(gradePick(FollowUpMode.BEST_ANSWER_VOTE, board(), "seed")).isFalse();
        assertThat(gradePick(FollowUpMode.PREDICT_POPULAR, board(), "seed")).isFalse();
    }

    @Test
    void spotTheAnswerWithAnEmptyBoardGradesEveryPickFalse() {
        // A parent that lost its answer key before the mint seeds nothing, so
        // nothing can be spotted.
        assertThat(gradePick(FollowUpMode.SPOT_THE_ANSWER, FollowUpOptionSet.empty(), "seed")).isFalse();
    }

    @Test
    void followUpPicksByAuthorCountsPicksPerAuthorAndExcludesSelfPicks() {
        Slide slide = slideWith(new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER));

        Map<String, Integer> picks = RoundEvaluator.followUpPicksByAuthor(slide, List.of(
                answer("p3", new FollowUpAnswer("opt-a"), 100),
                answer("p4", new FollowUpAnswer("opt-a"), 200),
                // A merged card credits every author it stands for.
                answer("p3", new FollowUpAnswer("opt-b"), 300),
                // Self-pick: the author of opt-a picking their own card pays nothing.
                answer("p1", new FollowUpAnswer("opt-a"), 400),
                // The seeded answer has no author, so picking it credits nobody.
                answer("p4", new FollowUpAnswer("seed"), 500)), board());

        assertThat(picks).containsOnly(entry("p1", 2), entry("p2", 1), entry("p5", 1));
    }

    @Test
    void followUpPicksByAuthorIsEmptyForTheUnscoredModesAndAnEmptyBoard() {
        List<Answer> picks = List.of(answer("p3", new FollowUpAnswer("opt-a"), 100));

        assertThat(RoundEvaluator.followUpPicksByAuthor(
                slideWith(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE)), picks, board())).isEmpty();
        assertThat(RoundEvaluator.followUpPicksByAuthor(
                slideWith(new FollowUpContent(FollowUpMode.PREDICT_POPULAR)), picks, board())).isEmpty();
        assertThat(RoundEvaluator.followUpPicksByAuthor(
                slideWith(new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER)), picks,
                FollowUpOptionSet.empty())).isEmpty();
        // Not a follow-up round at all.
        assertThat(RoundEvaluator.followUpPicksByAuthor(slideWith(mcq(Set.of("a"))), picks, board())).isEmpty();
    }

    @Test
    void picksDrawnSurviveACorrectGradeUnlikeVotes() {
        Slide slide = slideWith(new FollowUpContent(FollowUpMode.SPOT_THE_ANSWER));

        List<AnswerEvaluation> evals = RoundEvaluator.evaluate(slide, List.of(
                answer("spotter", new FollowUpAnswer("seed"), 100),
                answer("fooled", new FollowUpAnswer("opt-a"), 200)),
                START, Map.of("spotter", 4), board(), Map.of("spotter", 3, "fooled", 1));

        // Spotting the answer and writing a card that fooled the room are two
        // separate earnings: the votes a correct answer drew are zeroed as ever,
        // but the follow-up picks are not.
        assertThat(evals.get(0).correct()).isTrue();
        assertThat(evals.get(0).deceivedCount()).isEqualTo(3);
        assertThat(evals.get(1).correct()).isFalse();
        assertThat(evals.get(1).deceivedCount()).isEqualTo(1);
    }

    @Test
    void correctKeyRendersMcqAsSortedJoin() {
        assertThat(RoundEvaluator.correctKey(slideWith(mcq(Set.of("b", "a"))))).isEqualTo("a,b");
    }

    @Test
    void correctKeyRendersRankingAsCommaJoinedOrder() {
        // Order is preserved (unlike MCQ's sort) and comma-joined, so the board
        // can split it back into the ordered item ids at reveal.
        assertThat(RoundEvaluator.correctKey(slideWith(ranking(List.of("it-3", "it-1", "it-2")))))
                .isEqualTo("it-3,it-1,it-2");
    }

    @Test
    void describeChoiceRendersMcqSortedJoin() {
        AnswerEvaluation eval = RoundEvaluator.evaluate(slideWith(mcq(Set.of("a"))),
                List.of(answer("p", new McqAnswer(Set.of("b", "a")), 10)), START).get(0);

        assertThat(eval.choice()).isEqualTo("a,b");
    }

    // ── helpers ──────────────────────────────────────────────────────────────

    private static boolean gradeOne(Slide slide, AnswerPayload payload) {
        return RoundEvaluator.evaluate(slide, List.of(answer("p", payload, 10)), START).get(0).correct();
    }

    /** How one pick against {@code options} grades on a follow-up of {@code mode}. */
    private static boolean gradePick(FollowUpMode mode, FollowUpOptionSet options, String optionId) {
        return RoundEvaluator.evaluate(slideWith(new FollowUpContent(mode)),
                List.of(answer("p", new FollowUpAnswer(optionId), 10)), START,
                Map.of(), options, Map.of()).get(0).correct();
    }

    /**
     * A minted SPOT_THE_ANSWER board: the seeded answer (flagged, authorless), a
     * merged card owning two submitters, and a plain one.
     */
    private static FollowUpOptionSet board() {
        return new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-a", "Lyon", null, Set.of("p1"), false),
                new FollowUpOption("seed", "Paris", null, Set.of(), true),
                new FollowUpOption("opt-b", "Nice", null, Set.of("p2", "p5"), false)));
    }

    private static McqContent mcq(Set<String> correct) {
        return new McqContent(null, correct, null);
    }

    private static AxisContent axis(Map<String, AxisPoint> correctPositions, double tolerance) {
        return new AxisContent("Low X", "High X", "Low Y", "High Y",
                List.of(new AxisItem("it-1", "One", null, null), new AxisItem("it-2", "Two", null, null)),
                correctPositions, tolerance, ScoreMode.INSIDE_RADIUS);
    }

    private static MatchingContent matching(Map<String, String> correctPairs) {
        return new MatchingContent(
                List.of(new MatchItem("left-1", "One", null, null), new MatchItem("left-2", "Two", null, null)),
                List.of(new MatchItem("right-1", "Uno", null, null), new MatchItem("right-2", "Dos", null, null)),
                correctPairs, ScoreMode.EXACT);
    }

    private static GridContent grid(Map<String, String> correctCells) {
        return new GridContent(List.of("Row 1", "Row 2"), List.of("Col 1", "Col 2"),
                List.of(new GridItem("it-1", "One", null, null),
                        new GridItem("it-2", "Two", null, null),
                        new GridItem("it-3", "Three", null, null)),
                correctCells, ScoreMode.EXACT);
    }

    private static RankingContent ranking(List<String> correctOrder) {
        return new RankingContent(
                List.of(new RankItem("it-1", "One", null, null),
                        new RankItem("it-2", "Two", null, null),
                        new RankItem("it-3", "Three", null, null)),
                correctOrder, ScoreMode.EXACT);
    }

    private static PlaceOnImageContent place(Target... targets) {
        return new PlaceOnImageContent(null, List.of(targets), ScoreMode.INSIDE_RADIUS);
    }

    private static ScalesContent scales(Map<String, Double> correctValues, double tolerance) {
        return new ScalesContent(1, 5, "Low", "High",
                List.of(new ScaleItem("st-1", "One", null, null), new ScaleItem("st-2", "Two", null, null)),
                correctValues, tolerance);
    }

    private static Slide slideWith(SlideContent content) {
        Slide slide = new Slide();
        slide.setId("slide-1");
        slide.setContent(content);
        return slide;
    }

    private static Answer answer(String participantId, AnswerPayload payload, long msAfterStart) {
        Answer a = new Answer();
        a.setParticipantId(participantId);
        a.setSlideId("slide-1");
        a.setSubmittedAt(START.plusMillis(msAfterStart));
        a.setPayload(payload);
        return a;
    }
}
