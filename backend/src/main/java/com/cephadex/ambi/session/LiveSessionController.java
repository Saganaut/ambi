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

import jakarta.validation.Valid;

/**
 * REST surface for live sessions. Player and host commands arrive here over HTTP —
 * the WebSocket transport is broadcast-only — and the resulting state change is
 * pushed back to subscribers as a {@code SessionEvent}. For now this carries answer
 * submission; lobby/round commands will join it as they are wired.
 */
@RestController
@RequestMapping("/api/liveSessions")
public class LiveSessionController {

    private final LiveSessionAnswerService answerService;

    public LiveSessionController(LiveSessionAnswerService answerService) {
        this.answerService = answerService;
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
