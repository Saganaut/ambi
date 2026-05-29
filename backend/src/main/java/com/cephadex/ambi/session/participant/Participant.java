package com.cephadex.ambi.session.participant;

import java.time.Instant;
import java.util.List;
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
 * This serves as the domain for participants, will be stored in Redis during
 * live rounds and updated to mongodb at the end of
 * each round with mass publish methods. The userId should always be stripped
 * during live sessions and anything that references
 * this should use the participantId (answers, round results..)
 * 
 * Only call join method initially to create the player the first time,
 * then let mongodb and jackson reserialize it into its object
 * 
 * TODO: Decide if this gets re-used in new sessions or if its one instance per
 * session
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

    private Participant() {

    }

    public static Participant join(String userId,
            String displayName,
            Avatar avatar,
            String colorTag) {
        Objects.requireNonNull(userId, "userId required");
        Objects.requireNonNull(displayName, "displayName required");

        Participant p = new Participant();
        p.participantId = UUID.randomUUID().toString(); // generated, not passed in
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

    public void heartbeat() {
        this.lastSeenAt = Instant.now();
        this.connectionStatus = ConnectionStatus.ONLINE;
    }

    public void markDisconnected() {
        this.connectionStatus = ConnectionStatus.DISCONNECTED;
    }

    // TODO: need to add in current streak bonus and deception points
    public void awardPoints(
            boolean wasCorrect,
            boolean wasBestAnswer,
            boolean wasFastestCorrectAnswer,
            int deceivedCount, // How many participants were deceived by the answer submitted
            int points,
            int bestAnswerPoints,
            int deceptionPoints,
            int fastestCorrectAnswerPoints,
            boolean resetStreakOnStreakEnd,
            List<Settings.StreakMilestone> streakBonuses) {

        if (banned) {
            throw new IllegalStateException("banned participant cannot be scored");
        }

        if (wasCorrect) {
            this.score.recordCorrectAnswer(points);

            // Dynamic, instant O(1) Map lookup!
            if (streakBonuses != null) {
                int activeStreak = this.score.getCurrentStreak();
                Settings.StreakMilestone milestone = streakBonuses.get(activeStreak);

                if (milestone != null) {
                    this.score.awardStreakBonus(milestone.bonusPoints());
                }
            }
        } else {
            this.score.recordIncorrectAnswer(resetStreakOnStreakEnd);
        }

        if (wasBestAnswer) {
            this.score.awardBestAnswer(bestAnswerPoints);
        }

        if (deceptionPoints > 0 && deceivedCount > 0) {
            this.score.awardDeception(deceptionPoints * deceivedCount);
        }

        if (wasCorrect && wasFastestCorrectAnswer && (fastestCorrectAnswerPoints > 0)) {
            this.score.awardFastestAnswerBonus(fastestCorrectAnswerPoints);
        }
    }
}
