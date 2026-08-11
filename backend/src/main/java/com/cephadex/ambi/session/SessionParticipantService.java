package com.cephadex.ambi.session;

import java.time.Instant;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.SessionRoster;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.user.Avatar;

/**
 * Owns participant admission and departure for live sessions, including the
 * durable participant record, atomic roster membership, presence, rollback,
 * and participant delta events.
 */
@Service
public class SessionParticipantService {

    private static final Logger log = LoggerFactory.getLogger(SessionParticipantService.class);
    private static final int DEFAULT_MAX_PARTICIPANTS = 200;

    private final LiveSessionRepository sessions;
    private final ParticipantRepository participants;
    private final SessionRoster roster;
    private final PresenceStore presenceStore;
    private final EventPublisher publisher;

    public SessionParticipantService(LiveSessionRepository sessions, ParticipantRepository participants,
            SessionRoster roster, PresenceStore presenceStore, EventPublisher publisher) {
        this.sessions = sessions;
        this.participants = participants;
        this.roster = roster;
        this.presenceStore = presenceStore;
        this.publisher = publisher;
    }

    public JoinResult join(String roomCode, String userId, String displayName, Avatar avatar, String colorTag) {
        LiveSession session = sessions.findByRoomCode(roomCode)
                .filter(candidate -> !candidate.isTerminal())
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        Participant participant = Participant.join(userId, displayName, avatar, colorTag);
        participant.joinSession(session.getId());
        participants.save(participant);

        boolean admitted;
        try {
            admitted = roster.admit(session.getId(), session.getPublicId(), participant.getParticipantId(),
                    maxParticipants(session), SessionEvents.participantJoined(participant));
        } catch (RuntimeException failure) {
            rollbackJoin(session, participant, failure);
            throw failure;
        }
        if (!admitted) {
            ConflictException full = new ConflictException("SESSION_FULL",
                    "this session has reached its participant limit");
            rollbackJoin(session, participant, full);
            throw full;
        }

        try {
            participant.markAdmitted();
            participants.save(participant);
        } catch (RuntimeException failure) {
            rollbackJoin(session, participant, failure);
            throw failure;
        }
        presenceStore.save(session.getId(), participant.getParticipantId(), Presence.online(Instant.now()));
        return new JoinResult(session, participant);
    }

    public void leave(String sessionId, String participantId) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        if (session.isHost(participantId)) {
            throw new ConflictException("HOST_CANNOT_LEAVE",
                    "the host ends or cancels the session instead of leaving");
        }
        participants.findById(participantId)
                .filter(participant -> sessionId.equals(participant.getSessionId()))
                .ifPresent(participant -> {
                    participant.leaveSession();
                    participants.save(participant);
                });
        roster.remove(sessionId, participantId);
        presenceStore.remove(sessionId, participantId);
        publisher.publish(session.getPublicId(), SessionEvents.participantLeft(participantId));
    }

    private void rollbackJoin(LiveSession session, Participant participant, RuntimeException failure) {
        try {
            participants.delete(participant);
        } catch (RuntimeException cleanupFailure) {
            log.warn("Could not delete participant {} while rolling back a refused join to session {}",
                    participant.getParticipantId(), session.getId(), cleanupFailure);
            failure.addSuppressed(cleanupFailure);
        }
        try {
            roster.remove(session.getId(), participant.getParticipantId());
        } catch (RuntimeException cleanupFailure) {
            log.warn("Could not drop participant {} from the roster of session {} while rolling back a refused join",
                    participant.getParticipantId(), session.getId(), cleanupFailure);
            failure.addSuppressed(cleanupFailure);
        }
    }

    private int maxParticipants(LiveSession session) {
        Settings.DeckSettings settings = session.getDeck() == null ? null : session.getDeck().getSettings();
        Settings.AudienceSettings audience = settings == null ? null : settings.audienceSettings();
        return audience != null && audience.maxParticipants() > 0
                ? audience.maxParticipants()
                : DEFAULT_MAX_PARTICIPANTS;
    }

    public record JoinResult(LiveSession session, Participant participant) {
    }
}
