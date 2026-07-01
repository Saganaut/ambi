package com.cephadex.ambi.session;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.dto.AdvanceResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;

/**
 * Host-only round &amp; navigation control for a live session: closing submissions,
 * revealing responses and results, restarting a round, and driving slide-to-slide
 * navigation ({@code advance} / {@code goTo}). Owns the host authorization and
 * delegates the locked domain transitions to {@link LiveSessionOrchestrator},
 * which pushes the resulting {@code SessionEvent} to subscribers over the
 * WebSocket topic — these commands return no state in their response body.
 *
 * <p>Opening a round is reached through {@link #goTo} (a specific slide, validated
 * against the deck snapshot) or {@link #advance} (the next slide in order), never a
 * raw open — so the slide is always validated and the parent/child rule enforced.
 */
@Service
public class LiveSessionHostService {

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;
    private final LiveSessionOrchestrator orchestrator;

    public LiveSessionHostService(LiveSessionRepository sessions, ParticipantResolver participantResolver,
            LiveSessionOrchestrator orchestrator) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
        this.orchestrator = orchestrator;
    }

    /** Closes submissions on the current round (freezes and scores it). Host only. */
    public void closeSubmissions(String sessionId, String slideId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.closeSubmissions(sessionId, slideId);
    }

    /** Shows the response distribution (never the answer key). Host only. */
    public void revealResponses(String sessionId, String slideId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.revealResponses(sessionId, slideId);
    }

    /** Reveals the scored results (requires submissions already closed). Host only. */
    public void revealResults(String sessionId, String slideId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.revealResults(sessionId, slideId);
    }

    /** Reopens a round from scratch (blocked once it has been scored). Host only. */
    public void restartRound(String sessionId, String slideId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.restartRound(sessionId, slideId);
    }

    /**
     * Advances to and opens the next round. Host only. Returns the slide now open,
     * or a terminal marker when the deck snapshot is exhausted.
     */
    public AdvanceResponse advance(String sessionId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        Slide opened = orchestrator.advance(sessionId);
        return opened == null ? AdvanceResponse.exhausted() : AdvanceResponse.opened(opened.getId());
    }

    /** Opens a specific slide by host request (validated against the snapshot). Host only. */
    public void goTo(String sessionId, String slideId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.goTo(sessionId, slideId);
    }

    private void requireHost(String sessionId, AmbiPrincipal principal) {
        LiveSession session = sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
        Participant participant = participantResolver.resolve(session, principal);
        if (!session.isHost(participant.getParticipantId())) {
            throw new ForbiddenException("NOT_HOST", "only the host may perform this action");
        }
    }
}
