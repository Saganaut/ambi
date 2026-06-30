package com.cephadex.ambi.session;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.session.answer.LiveSessionAnswerService;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.dto.CreateSessionRequest;
import com.cephadex.ambi.session.dto.CreateSessionResponse;
import com.cephadex.ambi.session.dto.JoinSessionRequest;
import com.cephadex.ambi.session.dto.JoinSessionResponse;

import jakarta.validation.Valid;

/**
 * REST surface for live sessions. Player and host commands arrive here over HTTP —
 * the WebSocket transport is broadcast-only — and the resulting state change is
 * pushed back to subscribers as a {@code SessionEvent}. Carries lobby/lifecycle
 * commands (create, join, start, leave, end, cancel) and answer submission.
 */
@RestController
@RequestMapping("/api/liveSessions")
public class LiveSessionController {

    private final LiveSessionLobbyService lobbyService;
    private final LiveSessionAnswerService answerService;

    public LiveSessionController(LiveSessionLobbyService lobbyService, LiveSessionAnswerService answerService) {
        this.lobbyService = lobbyService;
        this.answerService = answerService;
    }

    /** Opens a new lobby running the given deck. Returns the room code + publicId to host with. */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CreateSessionResponse create(
            @Valid @RequestBody CreateSessionRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return lobbyService.createSession(body, principal);
    }

    /** Joins a session by room code. Returns the participantId + publicId to subscribe with. */
    @PostMapping("/join")
    public JoinSessionResponse join(
            @Valid @RequestBody JoinSessionRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return lobbyService.join(body, principal);
    }

    /** Starts play (host only): the lobby transitions to in-progress. */
    @PostMapping("/{id}/start")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void start(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        lobbyService.start(id, principal);
    }

    /** Removes the calling participant from the roster. */
    @PostMapping("/{id}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        lobbyService.leave(id, principal);
    }

    /** Ends the session normally (host only). */
    @PostMapping("/{id}/end")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void end(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        lobbyService.end(id, principal);
    }

    /** Cancels (abandons) the session (host only). */
    @PostMapping("/{id}/cancel")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void cancel(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        lobbyService.cancel(id, principal);
    }

    /**
     * Records the caller's answer for the open round on session {@code id}. Returns
     * 202 Accepted: the authoritative live tally is delivered to all players over the
     * session's WebSocket topic ({@code TallyUpdated}), not in this response body.
     */
    @PostMapping("/{id}/answers")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void submitAnswer(
            @PathVariable String id,
            @Valid @RequestBody SubmitAnswerRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        answerService.submit(id, body, principal);
    }
}
