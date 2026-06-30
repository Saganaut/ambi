package com.cephadex.ambi.session.participant;

import java.time.Instant;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.user.Avatar;

import lombok.Getter;

/**
 * Domain aggregate for a single player in a live session.
 *
 * <p>
 * A {@code Participant} lives in Redis for the duration of a live round and is
 * flushed to MongoDB at the end of each round via mass-publish methods. The
 * {@link #userId} should always be stripped while a session is live; anything
 * that references a player during play (answers, round results, …) must use the
 * {@link #participantId} instead.
 * </p>
 *
 * <p>
 * Construction is funneled through {@link #join}: call it once to create the
 * player the first time, then let MongoDB and Jackson rehydrate the object on
 * subsequent reads. The no-arg constructor exists only for that deserialization.
 * </p>
 *
 * <p>
 * <strong>TODO:</strong> decide whether a participant is reused across sessions
 * (see {@link #resetParticipant()}) or whether one instance is created per
 * session.
 * </p>
 **/

@Getter
@Document(collection = "participants")
public class Participant {

    @Id
    private String participantId;

    @Field("user_id")
    private String userId;

    @Field("display_name")
    private String displayName;

    @Field("connection_status")
    private ConnectionStatus connectionStatus;

    @Field("avatar")
    private Avatar avatar;

    @Field("color_tag")
    private String colorTag;

    @Field("joined_at")
    private Instant joinedAt = Instant.now();

    @Field("last_seen_at")
    private Instant lastSeenAt;

    @Field("score")
    private ParticipantScore score;

    @Field("banned")
    private boolean banned = false;

    /** No-arg constructor reserved for MongoDB/Jackson deserialization. */
    private Participant() {

    }

    /**
     * Creates a brand-new participant joining a session for the first time.
     *
     * <p>
     * Assigns a fresh random {@link #participantId}, marks the player
     * {@link ConnectionStatus#ONLINE}, stamps the join/last-seen timestamps, and
     * initializes an empty {@link ParticipantScore}.
     * </p>
     *
     * @param userId      the originating user's id; required (stripped while the
     *                    session is live)
     * @param displayName the name shown to other players; required
     * @param avatar      the player's avatar, may be {@code null}
     * @param colorTag    the player's color tag, may be {@code null}
     * @return a new, online participant ready to play
     * @throws NullPointerException if {@code userId} or {@code displayName} is
     *                              {@code null}
     */
    public static Participant join(String userId,
            String displayName,
            Avatar avatar,
            String colorTag) {
        Objects.requireNonNull(userId, "userId required");
        Objects.requireNonNull(displayName, "displayName required");

        Participant p = new Participant();
        p.participantId = UUID.randomUUID().toString();
        p.userId = userId;
        p.displayName = displayName;
        p.avatar = avatar;
        p.colorTag = colorTag;
        p.joinedAt = Instant.now();
        p.lastSeenAt = Instant.now();
        p.connectionStatus = ConnectionStatus.ONLINE;
        p.score = new ParticipantScore();
        p.banned = false;
        return p;
    }

    /**
     * Records activity from the player: refreshes {@link #lastSeenAt} and marks
     * them {@link ConnectionStatus#ONLINE}.
     */
    public void heartbeat() {
        this.lastSeenAt = Instant.now();
        this.connectionStatus = ConnectionStatus.ONLINE;
    }

    /**
     * Bans the participant. A banned participant can no longer be scored — see
     * {@link #awardPoints}.
     */
    public void ban() {
        this.banned = true;
    }

    /** Marks the participant as {@link ConnectionStatus#DISCONNECTED}. */
    public void markDisconnected() {
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
    }

    /**
     * Resets an existing participant for reuse in a new session instead of
     * creating a fresh one.
     *
     * <p>
     * Clears the score, lifts any ban, and re-stamps the join/last-seen
     * timestamps as if the player had just joined. Identity ({@link #participantId},
     * {@link #userId}) and profile ({@link #displayName}, {@link #avatar},
     * {@link #colorTag}) are preserved.
     * </p>
     *
     * <p>
     * Only relevant if participant objects are reused across sessions, which is
     * still TBD.
     * </p>
     */
    public void resetParticipant() {
        // This is used only if we are re-using participant objects which is TBD
        // If a user already has a participant entry instead of creating a new one we
        // reset the existing one
        this.score = new ParticipantScore();
        this.banned = false;
        this.joinedAt = Instant.now();
        this.lastSeenAt = Instant.now();
        this.connectionStatus = ConnectionStatus.ONLINE;
    }

    /**
     * Updates the participant's avatar.
     *
     * @param avatar the new avatar
     */
    public void updateAvatar(Avatar avatar) {
        this.avatar = avatar;
    }

    /**
     * Updates the participant's color tag.
     *
     * @param colorTag the new color tag
     */
    public void updateColor(String colorTag) {
        this.colorTag = colorTag;
    }

    /**
     * Updates the participant's display name.
     *
     * @param displayName the new display name
     */
    public void updateDisplayName(String displayName) {
        this.displayName = displayName;
    }

    /**
     * Applies every point delta a participant earned in a single round and
     * returns the total awarded.
     *
     * <p>
     * Each component is applied to the underlying {@link ParticipantScore} (which
     * holds the running total) and accumulated into the per-round delta returned
     * here, which is the value {@code RoundResult} records. The components are:
     * </p>
     * <ul>
     * <li>base points for a correct answer, plus any streak bonus configured for
     * the participant's current streak length;</li>
     * <li>a best-answer bonus;</li>
     * <li>deception points, multiplied by the number of players deceived;</li>
     * <li>a fastest-correct-answer bonus (only when correct).</li>
     * </ul>
     * An incorrect answer records the miss and, depending on
     * {@code resetStreakOnStreakEnd}, may end the streak.
     *
     * @param wasCorrect                 whether the participant answered correctly
     * @param wasBestAnswer              whether this was voted/judged the best answer
     * @param wasFastestCorrectAnswer    whether this was the fastest correct answer
     * @param deceivedCount              how many participants were deceived by the
     *                                   submitted answer
     * @param points                     base points for a correct answer
     * @param bestAnswerPoints           bonus points for the best answer
     * @param deceptionPoints            points per deceived participant
     * @param fastestCorrectAnswerPoints bonus points for the fastest correct answer
     * @param resetStreakOnStreakEnd     whether an incorrect answer resets the streak
     * @param streakBonuses              bonus points keyed by streak length;
     *                                   may be {@code null}
     * @return the total points awarded this round (the per-round delta)
     * @throws IllegalStateException if the participant is {@link #banned}
     */
    public int awardPoints(
            boolean wasCorrect,
            boolean wasBestAnswer,
            boolean wasFastestCorrectAnswer,
            int deceivedCount, // How many participants were deceived by the answer submitted
            int points,
            int bestAnswerPoints,
            int deceptionPoints,
            int fastestCorrectAnswerPoints,
            boolean resetStreakOnStreakEnd,
            Map<Integer, Integer> streakBonuses) {

        if (banned) {
            throw new IllegalStateException("banned participant cannot be scored");
        }

        // Sum of every point delta applied this round — this is the value the
        // RoundResult records as the participant's per-round score (the running
        // total lives on ParticipantScore; this is just the delta).
        int pointsAwarded = 0;

        if (wasCorrect) {
            this.score.recordCorrectAnswer(points);
            pointsAwarded += points;
            if (streakBonuses != null) {
                int activeStreak = this.score.getCurrentStreak();
                Integer bonus = streakBonuses.get(activeStreak);

                if (bonus != null) {
                    this.score.awardStreakBonus(bonus);
                    pointsAwarded += bonus;
                }
            }
        } else {
            this.score.recordIncorrectAnswer(resetStreakOnStreakEnd);
        }

        if (wasBestAnswer) {
            this.score.awardBestAnswer(bestAnswerPoints);
            pointsAwarded += bestAnswerPoints;
        }

        if (deceptionPoints > 0 && deceivedCount > 0) {
            int deception = deceptionPoints * deceivedCount;
            this.score.awardDeception(deception);
            pointsAwarded += deception;
        }

        if (wasCorrect && wasFastestCorrectAnswer && (fastestCorrectAnswerPoints > 0)) {
            this.score.awardFastestAnswerBonus(fastestCorrectAnswerPoints);
            pointsAwarded += fastestCorrectAnswerPoints;
        }

        return pointsAwarded;
    }
}
