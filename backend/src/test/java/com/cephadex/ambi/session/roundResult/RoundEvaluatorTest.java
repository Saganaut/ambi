package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.NumberContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.MatchingAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;

/**
 * Grading: each answer is compared against the slide's typed content key, exactly
 * one fastest-correct is flagged, and content with no static key never grades true.
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
    void contentWithNoStaticKeyNeverGradesCorrect() {
        Slide slide = slideWith(mcq(Set.of("a")));

        AnswerEvaluation eval = RoundEvaluator.evaluate(slide,
                List.of(answer("p", new FollowUpAnswer("a question"), 10)), START).get(0);

        assertThat(eval.correct()).isFalse();
        assertThat(eval.choice()).isNull(); // free-form: not tallied
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

    @Test
    void correctKeyRendersMcqAsSortedJoin() {
        assertThat(RoundEvaluator.correctKey(slideWith(mcq(Set.of("b", "a"))))).isEqualTo("a,b");
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

    private static ScalesContent scales(Map<String, Double> correctValues, double tolerance) {
        return new ScalesContent(1, 5, "Low", "High",
                List.of(new ScaleItem("st-1", "One"), new ScaleItem("st-2", "Two")),
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
