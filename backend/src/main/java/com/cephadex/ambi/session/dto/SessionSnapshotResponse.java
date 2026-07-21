package com.cephadex.ambi.session.dto;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.QAndAQuestionView;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.event.dto.VoteOptionView;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * A point-in-time snapshot of a live session, served by {@code GET
 * /api/liveSessions/{id}} so a client that (re)connects can rehydrate its state
 * in one read before it starts applying the delta {@code SessionEvent}s from the
 * topic. The session broadcasts only deltas with no replay, so without this a
 * refresh, reconnect, or late join would have no way to learn the current state.
 *
 * <p>Deliberately built from the <strong>same participant-safe DTOs the events
 * carry</strong> ({@link ParticipantView}, {@link SlideView},
 * {@link ScoreboardEntry}) so the snapshot and the deltas agree field-for-field:
 * the client seeds its store from this shape and every subsequent event patches
 * the same shape. No answer key, {@code userId}, or authoring secret travels here
 * — that stripping is the DTO factories' job, reused as-is.
 *
 * @param sessionId             the session id (the {@code {id}} used for commands)
 * @param publicId              the session's public handle — the STOMP topic key to subscribe with
 * @param roomCode              the short join code participants enter (or scan via QR) to join the room
 * @param status                lifecycle status (lobby / in-progress / finished / cancelled)
 * @param phase                 the current round phase, or the idle default between rounds
 * @param currentSlideId        the open slide, or {@code null} between rounds
 * @param currentSlide          the participant-safe view of the open slide, or {@code null} between rounds
 * @param currentRoundStartedAt when the open round started, or {@code null} between rounds
 * @param currentRoundDeadline  the timed round's auto-close instant (ADR 002), or {@code null} for an untimed round; while paused it holds the deadline as frozen at the pause
 * @param currentRoundPausedAt  when the round timer was paused, or {@code null} while it is running (or untimed)
 * @param optionTally           the open round's live per-option counts, or {@code null} between rounds
 * @param qAndAQuestions        the open Q&amp;A round's questions (with host answers), or {@code null} when the open slide isn't Q&amp;A
 * @param voteOptions           the voting round's anonymised options (D3), or {@code null} outside a VOTE phase
 * @param myVoteOptionId        the option the caller has voted for this round, or {@code null} if they haven't (or outside a VOTE phase)
 * @param votesCast             how many votes have been cast so far, or {@code null} outside a VOTE phase
 * @param roster                every participant, in join order, with live connection status
 * @param scoreboard            current standings, ranked by points
 * @param viewerParticipantId   the calling participant's id (so the client can spot itself)
 * @param viewerIsHost          whether the caller is the session host
 * @param showRoomCodeInHeader  whether the deck's invite settings show the room code in the persistent header
 * @param showJoinInfoInResults whether the deck's invite settings show the QR + room code on the results screen
 */
public record SessionSnapshotResponse(
        String sessionId,
        String publicId,
        String roomCode,
        LiveSessionLifecycle status,
        RoundPhase phase,
        String currentSlideId,
        SlideView currentSlide,
        Instant currentRoundStartedAt,
        Instant currentRoundDeadline,
        Instant currentRoundPausedAt,
        Map<String, Integer> optionTally,
        List<QAndAQuestionView> qAndAQuestions,
        List<VoteOptionView> voteOptions,
        String myVoteOptionId,
        Integer votesCast,
        List<ParticipantView> roster,
        List<ScoreboardEntry> scoreboard,
        String viewerParticipantId,
        boolean viewerIsHost,
        boolean showRoomCodeInHeader,
        boolean showJoinInfoInResults) {
}
