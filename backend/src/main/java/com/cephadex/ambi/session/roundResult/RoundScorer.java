package com.cephadex.ambi.session.roundResult;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.SessionTypes.ParticipantOutcome;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.participant.Participant;

/**
 * Closes a round by running the three collaborators in sequence, kept in one
 * place so the round-close flow reads as a single unit:
 *
 * <ol>
 * <li>{@link RoundEvaluator#evaluate} — derive the per-participant facts
 * once;</li>
 * <li>{@code Participant.awardPoints} — apply each scorer's points, capturing
 * the per-round delta it returns;</li>
 * <li>{@link RoundResult#compute} — assemble the immutable record from the
 * resulting {@link ParticipantOutcome}s.</li>
 * </ol>
 *
 * <p>
 * It mutates the passed-in {@link Participant}s' scores but persists nothing:
 * the caller owns gathering the inputs (answers, participants, settings, start
 * time) and saving the participants + the returned record. Pure given its
 * inputs, so it is safe to re-run (e.g. on a round restart).
 *
 * @see RoundEvaluator
 */
public final class RoundScorer {

    private RoundScorer() {
    }

    /**
     * Scores one round and builds its record.
     *
     * @param sessionId        the live session
     * @param slide            the slide that was open (from the session's deck
     *                         snapshot)
     * @param answers          every answer submitted this round
     * @param participantsById the round's participants keyed by
     *                         {@code participantId},
     *                         so an evaluation can find the player to score
     * @param pointSettings    the resolved point values for this slide/deck
     * @param roundStartedAt   when the round opened (for response timing)
     * @param closedAt         when submissions closed
     * @return the assembled, not-yet-persisted {@link RoundResult}
     */
    public static RoundResult score(
            String sessionId,
            Slide slide,
            List<Answer> answers,
            Map<String, Participant> participantsById,
            Settings.PointSettings pointSettings,
            Instant roundStartedAt,
            Instant closedAt) {

        List<AnswerEvaluation> evaluations = RoundEvaluator.evaluate(slide, answers, roundStartedAt);

        List<ParticipantOutcome> outcomes = new ArrayList<>(evaluations.size());
        for (AnswerEvaluation eval : evaluations) {
            Participant participant = participantsById.get(eval.participantId());

            // A participant who has since left/been removed still has their answer
            // recorded, but there is no live score to mutate — record zero points.
            int pointsAwarded = participant == null ? 0
                    : participant.awardPoints(
                            eval.correct(),
                            eval.bestAnswer(),
                            eval.fastestCorrect(),
                            eval.deceivedCount(),
                            pointSettings.points(),
                            pointSettings.bestAnswerPoints(),
                            pointSettings.deceptionPoints(),
                            pointSettings.fastestCorrectAnswerPoints(),
                            pointSettings.resetStreakOnStreakEnd(),
                            pointSettings.streakBonuses());

            outcomes.add(new ParticipantOutcome(
                    eval.participantId(), eval.choice(), eval.correct(), pointsAwarded, eval.responseTimeMs()));
        }

        return RoundResult.compute(sessionId, slide, outcomes, closedAt)
                .correctOption(RoundEvaluator.correctKey(slide));
    }
}
