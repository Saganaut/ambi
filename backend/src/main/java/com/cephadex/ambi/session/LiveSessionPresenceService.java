package com.cephadex.ambi.session;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;

/**
 * Participant self-service presence for a live session: re-identifying after a
 * dropped connection and liveness heartbeats. Resolves the caller to their roster
 * {@link Participant} (which is also the authorization — a non-participant can't
 * resolve) and delegates to {@link LiveSessionOrchestrator}.
 */
@Service
public class LiveSessionPresenceService {

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;
    private final LiveSessionOrchestrator orchestrator;

    public LiveSessionPresenceService(LiveSessionRepository sessions, ParticipantResolver participantResolver,
            LiveSessionOrchestrator orchestrator) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
        this.orchestrator = orchestrator;
    }

    /** Re-identifies the caller after a reconnect: marks them online and publishes. */
    public void reconnect(String sessionId, AmbiPrincipal principal) {
        LiveSession session = requireSession(sessionId);
        Participant participant = participantResolver.resolve(session, principal);
        orchestrator.reconnect(sessionId, participant.getParticipantId());
    }

    /**
     * Records a liveness heartbeat for the caller (server-debounced, no broadcast).
     * A host beat also feeds the host-disconnect watch (F5 / ADR 002), so the host
     * flag is resolved here where the session is already loaded.
     */
    public void heartbeat(String sessionId, AmbiPrincipal principal) {
        LiveSession session = requireSession(sessionId);
        Participant participant = participantResolver.resolve(session, principal);
        orchestrator.heartbeat(sessionId, participant.getParticipantId(),
                session.isHost(participant.getParticipantId()));
    }

    private LiveSession requireSession(String sessionId) {
        return sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
    }
}
