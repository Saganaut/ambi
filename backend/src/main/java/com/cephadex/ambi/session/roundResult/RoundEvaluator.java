package com.cephadex.ambi.session.roundResult;

import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.SessionTypes.ParticipantId;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.McqAnswer;

/**
 * Derives the per-participant facts of a round <b>once</b>, from the slide and the
 * submitted answers, so scoring and the {@link RoundResult} record read the same
 * {@link AnswerEvaluation}s instead of each re-deriving them.
 *
 * <p>Pure and side-effect free: it touches no participant state and persists
 * nothing, so it is safe to re-run (e.g. on {@code restartRound}). The caller
 * sequences the round close:
 *
 * <pre>
 *   var evals = RoundEvaluator.evaluate(slide, answers, startedAt);   // derive once
 *   var outcomes = evals.stream().map(e -&gt; {
 *       int pts = participantOf(e.participantId()).awardPoints(        // mutate score
 *               e.correct(), e.bestAnswer(), e.fastestCorrect(), e.deceivedCount(),
 *               settings...);
 *       return new ParticipantOutcome(
 *               e.participantId(), e.choice(), e.correct(), pts, e.responseTimeMs());
 *   }).toList();
 *   RoundResult.compute(sid, slide, outcomes, closedAt);              // record
 * </pre>
 */
public final class RoundEvaluator {

    private RoundEvaluator() {
    }

    public static List<AnswerEvaluation> evaluate(Slide slide, List<Answer> answers, Instant roundStartedAt) {
        // Content-independent facts + the correctness grade, in one pass; we track
        // the fastest correct responder so exactly one evaluation is flagged.
        record Graded(ParticipantId participantId, String choice, boolean correct, long responseTimeMs) {
        }
        List<Graded> graded = new ArrayList<>(answers.size());

        ParticipantId fastest = null;
        long fastestMs = Long.MAX_VALUE;

        for (Answer answer : answers) {
            ParticipantId pid = new ParticipantId(answer.getParticipantId());
            long responseTimeMs = responseTime(roundStartedAt, answer.getSubmittedAt());
            boolean correct = isCorrect(slide, answer.getPayload());
            String choice = describeChoice(answer.getPayload());

            graded.add(new Graded(pid, choice, correct, responseTimeMs));

            if (correct && responseTimeMs < fastestMs) {
                fastestMs = responseTimeMs;
                fastest = pid;
            }
        }

        List<AnswerEvaluation> evaluations = new ArrayList<>(graded.size());
        for (Graded g : graded) {
            boolean fastestCorrect = g.correct() && g.participantId().equals(fastest);
            evaluations.add(new AnswerEvaluation(
                    g.participantId(),
                    g.choice(),
                    g.correct(),
                    fastestCorrect,
                    false, // bestAnswer  — SEAM (see below)
                    0,     // deceivedCount — SEAM (see below)
                    g.responseTimeMs()));
        }
        return evaluations;
    }

    private static long responseTime(Instant startedAt, Instant submittedAt) {
        if (startedAt == null || submittedAt == null) {
            return 0L;
        }
        return Math.max(0L, Duration.between(startedAt, submittedAt).toMillis());
    }

    /**
     * SEAM: grading needs the slide's correct-answer key, which lives in the typed
     * {@code content/} payload that is not yet a field on {@link Slide} (see the
     * slide README open items). Until {@code SlideContent} is wired in, nothing can
     * be graded correct. When it lands, switch on the {@link AnswerPayload} subtype
     * and compare against the slide's key here — this is the only place to change.
     */
    private static boolean isCorrect(Slide slide, AnswerPayload payload) {
        // TODO: grade `payload` against `slide` content once SlideContent is wired in.
        return false;
    }

    /**
     * A compact, record-friendly rendering of the participant's selection, used for
     * the round's option tallies. Only the tallyable types need a rendering; the
     * rest (free text, drawings, …) return null and are simply not counted.
     */
    private static String describeChoice(AnswerPayload payload) {
        if (payload instanceof McqAnswer mcq) {
            // Sorted so multi-select choices tally under a stable key.
            return mcq.optionIds().stream().sorted().reduce((a, b) -> a + "," + b).orElse(null);
        }
        // TODO: render other tallyable AnswerPayload types as they are graded.
        return null;
    }
}