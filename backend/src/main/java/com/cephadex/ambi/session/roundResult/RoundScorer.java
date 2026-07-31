package com.cephadex.ambi.session.roundResult;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.SessionTypes.ParticipantOutcome;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
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
 * One round shape does not fit that sequence: a {@code SPOT_THE_ANSWER}
 * follow-up pays the authors of the cards on its board, and those cards were
 * written in the <em>parent</em> round, so an earner may have no answer — and
 * therefore no evaluation — in this one. {@link #awardAbsentAuthors} is the
 * step that reaches them; see its Javadoc for what it deliberately does not do.
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
     * @param votesReceived    best-answer votes drawn per answer author during the
     *                         round's VOTE phase (empty when the round wasn't
     *                         voted on — see {@link RoundEvaluator})
     * @param followUpOptions  the candidate board this round was minted with,
     *                         read back from its snapshot — the answer key a
     *                         {@code SPOT_THE_ANSWER} pick is graded against, and
     *                         the only record of who authored which card.
     *                         {@link FollowUpOptionSet#empty()} for every round
     *                         that isn't a follow-up
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
            Map<String, Integer> votesReceived,
            FollowUpOptionSet followUpOptions,
            Instant roundStartedAt,
            Instant closedAt) {

        // Derived once here rather than inside evaluate(), because it is also the
        // input to the answerless-author pass below — the authors on a follow-up
        // board wrote their cards in the PARENT round, so many of them have no
        // evaluation in this one.
        Map<String, Integer> picksByAuthor =
                RoundEvaluator.followUpPicksByAuthor(slide, answers, followUpOptions);
        List<AnswerEvaluation> evaluations = RoundEvaluator.evaluate(
                slide, answers, roundStartedAt, votesReceived, followUpOptions, picksByAuthor);

        List<ParticipantOutcome> outcomes = new ArrayList<>(evaluations.size());
        Set<String> scored = new HashSet<>(evaluations.size());
        for (AnswerEvaluation eval : evaluations) {
            Participant participant = participantsById.get(eval.participantId());
            scored.add(eval.participantId());

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

        awardAbsentAuthors(picksByAuthor, scored, participantsById, pointSettings);

        return RoundResult.compute(sessionId, slide, outcomes, closedAt)
                .correctOption(RoundEvaluator.correctKey(slide));
    }

    /**
     * Pays the {@code SPOT_THE_ANSWER} authors whose card drew picks but who
     * never picked themselves.
     *
     * <p>
     * They are real earners with no {@link AnswerEvaluation}: their submission
     * belongs to the <em>parent</em> round, so nothing in this round's answers
     * represents them. Two deliberate consequences:
     * </p>
     * <ul>
     * <li><b>Their streak is untouched.</b> {@code awardPoints(false, …)} would
     * record a miss and possibly end a streak, which is wrong — they did not
     * answer <em>incorrectly</em>, they did not answer. So this goes through
     * {@link Participant#awardDeception}, which applies the points and nothing
     * else.</li>
     * <li><b>They get no {@link ParticipantOutcome}.</b> A phantom outcome would
     * inflate the round's {@code numberOfParticipants} (defined as the answers
     * it collected) and add a fictitious 0&nbsp;ms response time to its average,
     * so their points land on the running {@link Participant} score — which is
     * what the scoreboard and every later snapshot read — but the round's own
     * per-participant list stays exactly the set of people who played it. The
     * trade-off is that the reveal's per-round delta cannot show them; the
     * scoreboard movement is where their points surface.</li>
     * </ul>
     * A banned author is skipped rather than scored (and rather than throwing):
     * their card can still be on a board minted before the ban, but they are out
     * of the game.
     */
    private static void awardAbsentAuthors(Map<String, Integer> picksByAuthor, Set<String> scored,
            Map<String, Participant> participantsById, Settings.PointSettings pointSettings) {
        for (Map.Entry<String, Integer> credit : picksByAuthor.entrySet()) {
            if (scored.contains(credit.getKey())) {
                continue; // already paid through their own evaluation's deceivedCount
            }
            Participant author = participantsById.get(credit.getKey());
            if (author != null && !author.isBanned()) {
                author.awardDeception(credit.getValue(), pointSettings.deceptionPoints());
            }
        }
    }
}
