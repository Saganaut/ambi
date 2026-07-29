package com.cephadex.ambi.session;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.session.answer.LiveSessionAnswerService;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.dto.SubmitVoteRequest;
import com.cephadex.ambi.session.dto.AdvanceResponse;
import com.cephadex.ambi.session.dto.CreateSessionRequest;
import com.cephadex.ambi.session.dto.CreateSessionResponse;
import com.cephadex.ambi.session.dto.HostAnswerRequest;
import com.cephadex.ambi.session.dto.JoinSessionRequest;
import com.cephadex.ambi.session.dto.JoinSessionResponse;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;

import jakarta.validation.Valid;

/**
 * REST surface for live sessions. Player and host commands arrive here over HTTP —
 * the WebSocket transport is broadcast-only — and the resulting state change is
 * pushed back to subscribers as a {@code SessionEvent}. Carries lobby/lifecycle
 * commands (create, join, start, leave, end, cancel), answer submission, host round
 * &amp; navigation control, and participant presence.
 */
@RestController
@RequestMapping("/api/liveSessions")
public class LiveSessionController {

    private final LiveSessionLobbyService lobbyService;
    private final LiveSessionAnswerService answerService;
    private final LiveSessionHostService hostService;
    private final LiveSessionPresenceService presenceService;
    private final LiveSessionSnapshotService snapshotService;

    public LiveSessionController(LiveSessionLobbyService lobbyService, LiveSessionAnswerService answerService,
            LiveSessionHostService hostService, LiveSessionPresenceService presenceService,
            LiveSessionSnapshotService snapshotService) {
        this.lobbyService = lobbyService;
        this.answerService = answerService;
        this.hostService = hostService;
        this.presenceService = presenceService;
        this.snapshotService = snapshotService;
    }

    /**
     * A point-in-time snapshot of the session for the calling participant. Clients
     * fetch this once on (re)connect to seed their state, then keep it current from
     * the {@code SessionEvent} stream on the session's WebSocket topic — the
     * broadcast carries only deltas with no replay.
     */
    @GetMapping("/{id}")
    public SessionSnapshotResponse snapshot(
            @PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        return snapshotService.getSnapshot(id, principal);
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

    /**
     * Records the caller's best-answer vote for the voting round on session
     * {@code id} (D3). The option id is the opaque handle carried on
     * {@code VotingOpened} / the snapshot's {@code voteOptions}. Returns 202
     * Accepted: the running vote count is delivered to all players over the
     * session's WebSocket topic ({@code VoteCast}), not in this response body.
     */
    @PostMapping("/{id}/votes")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void submitVote(
            @PathVariable String id,
            @Valid @RequestBody SubmitVoteRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        answerService.submitVote(id, body, principal);
    }

    /**
     * Stores the caller's rendered drawing (a canvas PNG) for a Drawing round on
     * session {@code id}. Returns the stored {@link AppImage} (presigned on this
     * REST path) which the client then submits inside a {@code DrawingAnswer} via
     * {@code POST /{id}/answers} — answer validation only accepts images stored
     * through this route for this session.
     */
    @PostMapping(path = "/{id}/drawings", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    public AppImage uploadDrawing(
            @PathVariable String id,
            @RequestPart("file") MultipartFile file,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        return answerService.storeDrawing(id, bytesOf(file), file.getContentType(), principal);
    }

    private static byte[] bytesOf(MultipartFile file) {
        try {
            return file.getBytes();
        } catch (IOException e) {
            throw new ValidationException("Could not read the uploaded file.");
        }
    }

    // ── Host round & navigation control ──────────────────────────────────────

    /**
     * Advances to and opens the next round (host only). Returns the slide the new
     * round opened on, or a terminal marker when the deck snapshot is exhausted
     * (the cue for the final podium). The round-start event is broadcast over the
     * session topic.
     */
    @PostMapping("/{id}/advance")
    public AdvanceResponse advance(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        return hostService.advance(id, principal);
    }

    /** Opens a specific slide's round (host only), validated against the deck snapshot. */
    @PostMapping("/{id}/rounds/{slideId}")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void goToRound(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.goTo(id, slideId, principal);
    }

    /** Closes submissions on the current round and scores it (host only). */
    @PostMapping("/{id}/rounds/{slideId}/close")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void closeRound(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.closeSubmissions(id, slideId, principal);
    }

    /**
     * Closes submissions unscored and opens best-answer voting on the round's
     * anonymised submissions (host only, D3); scoring waits for the results reveal
     * so the votes count. Voters receive the options via {@code VotingOpened}.
     */
    @PostMapping("/{id}/rounds/{slideId}/open-voting")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void openVoting(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.openVoting(id, slideId, principal);
    }

    /** Shows the response distribution for a round (host only); never the answer key. */
    @PostMapping("/{id}/rounds/{slideId}/reveal-responses")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void revealResponses(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.revealResponses(id, slideId, principal);
    }

    /**
     * Reveals the scored results for a round (host only); closes + scores an open
     * round first. 409 when {@code slideId} is not the session's current round.
     */
    @PostMapping("/{id}/rounds/{slideId}/reveal-results")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void revealResults(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.revealResults(id, slideId, principal);
    }

    /** Reopens a round from scratch (host only); blocked once it has been scored. */
    @PostMapping("/{id}/rounds/{slideId}/restart")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void restartRound(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.restartRound(id, slideId, principal);
    }

    /**
     * Pauses the open timed round's auto-close countdown (host only). Submissions
     * stay open; subscribers learn of the freeze via {@code TimerPaused}.
     */
    @PostMapping("/{id}/rounds/{slideId}/pause-timer")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void pauseTimer(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.pauseTimer(id, slideId, principal);
    }

    /**
     * Resumes a paused round timer (host only); the recomputed deadline reaches
     * subscribers via {@code TimerResumed}.
     */
    @PostMapping("/{id}/rounds/{slideId}/resume-timer")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void resumeTimer(
            @PathVariable String id, @PathVariable String slideId,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.resumeTimer(id, slideId, principal);
    }

    /**
     * Types the host's answer next to a Q&amp;A question (host only). A blank body
     * clears it. The updated question list reaches subscribers as
     * {@code QAndAUpdated} over the session topic, not in this response.
     */
    @PostMapping("/{id}/rounds/{slideId}/questions/{questionId}/host-answer")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void answerQuestion(
            @PathVariable String id, @PathVariable String slideId, @PathVariable String questionId,
            @Valid @RequestBody HostAnswerRequest body,
            @AuthenticationPrincipal AmbiPrincipal principal) {
        hostService.answerQuestion(id, slideId, questionId, body.answer(), principal);
    }

    // ── Participant presence ─────────────────────────────────────────────────

    /** Re-identifies the caller after a dropped connection: marks them online and broadcasts. */
    @PostMapping("/{id}/reconnect")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public void reconnect(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        presenceService.reconnect(id, principal);
    }

    /** Records a liveness heartbeat for the caller (server-debounced, no broadcast). */
    @PostMapping("/{id}/heartbeat")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void heartbeat(@PathVariable String id, @AuthenticationPrincipal AmbiPrincipal principal) {
        presenceService.heartbeat(id, principal);
    }
}
