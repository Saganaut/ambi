package com.cephadex.ambi.session.roundResult;

/**
 * The per-participant facts of a single round, derived once by
 * {@link RoundEvaluator} from the slide and the submitted answers.
 *
 * <p>
 * This is the shared intermediate that removes the duplication: both consumers
 * read the same evaluation instead of each re-deriving {@code correct} /
 * {@code fastestCorrect} / {@code responseTimeMs}:
 *
 * <ul>
 * <li><b>scoring</b> — feeds {@code Participant.awardPoints(...)}, which
 * mutates
 * the participant's running {@code ParticipantScore};</li>
 * <li><b>the record</b> — becomes a {@code ParticipantOutcome} in the immutable
 * {@link RoundResult}.</li>
 * </ul>
 *
 * <p>
 * It is deliberately <b>pre-scoring</b>: it carries the facts, not the points.
 * Points are streak-dependent (cross-round state), so they are applied by
 * {@code Participant.awardPoints} and recorded as the per-round delta it
 * returns.
 *
 * @param participantId  who submitted the answer
 * @param choice         compact, tally-friendly rendering of what was chosen
 *                       (e.g.
 *                       joined MCQ option ids); {@code null} if the type isn't
 *                       tallyable
 * @param correct        whether the answer was graded correct
 * @param fastestCorrect fastest among the correct answers this round (at most
 *                       one true)
 * @param bestAnswer     host/peer-selected "best answer" (deception-style
 *                       games);
 *                       SEAM — see {@link RoundEvaluator}
 * @param deceivedCount  how many participants this answer deceived (deception
 *                       games); SEAM
 * @param responseTimeMs time from round start to submission, in milliseconds
 */
public record AnswerEvaluation(
                String participantId,
                String choice,
                boolean correct,
                boolean fastestCorrect,
                boolean bestAnswer,
                int deceivedCount,
                long responseTimeMs) {
}
