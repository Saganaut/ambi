package com.cephadex.ambi.session;

import org.springframework.stereotype.Service;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckService;
import com.cephadex.ambi.session.LiveSessionOrchestrator.JoinResult;
import com.cephadex.ambi.session.dto.CreateSessionRequest;
import com.cephadex.ambi.session.dto.CreateSessionResponse;
import com.cephadex.ambi.session.dto.JoinSessionRequest;
import com.cephadex.ambi.session.dto.JoinSessionResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;

/**
 * Application service for live-session lobby &amp; lifecycle commands (create, join,
 * start, leave, end, cancel). Owns the HTTP-facing concerns — deck access, host
 * profile resolution, host/roster authorization — and delegates the domain
 * transitions to {@link LiveSessionOrchestrator}.
 */
@Service
public class LiveSessionLobbyService {

    private final DeckService deckService;
    private final UserService userService;
    private final LiveSessionRepository sessions;
    private final LiveSessionOrchestrator orchestrator;
    private final ParticipantResolver participantResolver;

    public LiveSessionLobbyService(DeckService deckService, UserService userService,
            LiveSessionRepository sessions, LiveSessionOrchestrator orchestrator,
            ParticipantResolver participantResolver) {
        this.deckService = deckService;
        this.userService = userService;
        this.sessions = sessions;
        this.orchestrator = orchestrator;
        this.participantResolver = participantResolver;
    }

    /** Opens a new lobby running {@code request.deckId()} — any deck the host can view. */
    public CreateSessionResponse createSession(CreateSessionRequest request, AmbiPrincipal principal) {
        Deck deck = deckService.getViewable(request.deckId(), principal);
        User host = userService.requireUser(principal.userId());
        LiveSession session = orchestrator.createSession(
                principal.userId(), host.getDisplayName(), host.getAvatar(), deck);
        return CreateSessionResponse.from(session, host);
    }

    /** Joins the session behind {@code request.roomCode()} as a new participant. */
    public JoinSessionResponse join(JoinSessionRequest request, AmbiPrincipal principal) {
        JoinResult result = orchestrator.join(request.roomCode(), principal.userId(),
                request.displayName(), request.avatar(), request.colorTag());
        return JoinSessionResponse.from(result.session(), result.participant());
    }

    /** Starts play. Host only. */
    public void start(String sessionId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.beginPlay(sessionId);
    }

    /** Removes the calling participant from the roster. */
    public void leave(String sessionId, AmbiPrincipal principal) {
        LiveSession session = requireSession(sessionId);
        Participant participant = participantResolver.resolve(session, principal);
        orchestrator.leave(sessionId, participant.getParticipantId());
    }

    /** Ends the session normally. Host only. */
    public void end(String sessionId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.endLiveSession(sessionId);
    }

    /** Cancels (abandons) the session. Host only. */
    public void cancel(String sessionId, AmbiPrincipal principal) {
        requireHost(sessionId, principal);
        orchestrator.cancelSession(sessionId);
    }

    private LiveSession requireSession(String sessionId) {
        return sessions.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
    }

    private void requireHost(String sessionId, AmbiPrincipal principal) {
        LiveSession session = requireSession(sessionId);
        Participant participant = participantResolver.resolve(session, principal);
        if (!session.isHost(participant.getParticipantId())) {
            throw new ForbiddenException("NOT_HOST", "only the host may perform this action");
        }
    }
}
