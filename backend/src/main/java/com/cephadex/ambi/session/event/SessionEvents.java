package com.cephadex.ambi.session.event;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.event.dto.AllocationTargetView;
import com.cephadex.ambi.session.event.dto.DrawingSubmissionView;
import com.cephadex.ambi.session.event.dto.FollowUpConfigView;
import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.PlaceTargetView;
import com.cephadex.ambi.session.event.dto.QAndAQuestionView;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.event.dto.VoteOptionView;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantScore;
import com.cephadex.ambi.session.participant.enums.RemovalReason;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.roundResult.RoundResult;

/**
 * Builds {@link SessionEvent}s from domain objects. This is the single chokepoint
 * for the wire-safety rules: it strips {@code userId} (participants travel as
 * {@link ParticipantView}), strips the answer key from slides (via
 * {@code SlideView}), and never copies authoring secrets. Keep all event
 * construction here so those rules live in one auditable place rather than being
 * re-derived at each {@code publish} call site.
 *
 * <p>Pure given its inputs — no Spring, no I/O — so it's a static factory (mirrors
 * {@code RoundScorer} / {@code SessionTypes}).
 */
public final class SessionEvents {

    private SessionEvents() {
    }

    public static LiveSessionStarted liveSessionStarted(LiveSession session) {
        return new LiveSessionStarted(session.getStatus(), session.getPhase());
    }

    public static ParticipantJoined participantJoined(Participant participant) {
        return new ParticipantJoined(ParticipantView.from(participant));
    }

    public static ParticipantLeft participantLeft(String participantId) {
        return new ParticipantLeft(participantId);
    }

    public static ParticipantReconnected participantReconnected(Participant participant) {
        return new ParticipantReconnected(ParticipantView.from(participant));
    }

    public static ParticipantRemoved participantRemoved(String participantId, RemovalReason reason,
            List<String> roster) {
        return new ParticipantRemoved(participantId, reason, List.copyOf(roster));
    }

    public static PresenceChanged presenceChanged(String participantId, Presence presence) {
        return new PresenceChanged(participantId, presence.status(), presence.lastSeenAt());
    }

    /**
     * Round opened hidden (entered SUBMIT); reads the slide id/start time from the
     * round state. {@code imageUrl} resolves a slide item's {@link AppImage} to a
     * renderable URL, for the config views that carry images pre-resolved (see
     * {@code MatchingConfigView}). {@code followUp} / {@code hasFollowUp} are the
     * round's follow-up dimension, which only the caller can resolve against the
     * deck (see {@link SlideView}).
     */
    public static RoundStarted roundStarted(LiveRoundState state, Slide slide, AnswerSettings effectiveAnswer,
            Function<AppImage, String> imageUrl, FollowUpConfigView followUp, boolean hasFollowUp) {
        return new RoundStarted(state.currentSlideId(),
                SlideView.from(slide, effectiveAnswer, imageUrl, followUp, hasFollowUp),
                state.roundStartedAt(), state.deadline());
    }

    /**
     * Round is showing live results (entered SUBMIT_LIVE) — the opening event for an
     * {@code IMMEDIATE} slide, or the mid-round go-live toggle. Carries the slide (it
     * may be the first event for this slide) and the current tally.
     */
    public static LiveResultsShown liveResultsShown(LiveRoundState state, Slide slide,
            Map<String, Integer> optionCounts, AnswerSettings effectiveAnswer,
            Function<AppImage, String> imageUrl, FollowUpConfigView followUp, boolean hasFollowUp) {
        return new LiveResultsShown(state.currentSlideId(),
                SlideView.from(slide, effectiveAnswer, imageUrl, followUp, hasFollowUp),
                state.roundStartedAt(), Map.copyOf(optionCounts), state.deadline());
    }

    /** The mid-round go-live toggle: no slide (the client already has it from {@code RoundStarted}). */
    public static LiveResultsShown liveResultsShown(LiveRoundState state, Map<String, Integer> optionCounts) {
        return new LiveResultsShown(state.currentSlideId(), null, state.roundStartedAt(), Map.copyOf(optionCounts),
                state.deadline());
    }

    public static TallyUpdated tallyUpdated(String slideId, Map<String, Integer> optionCounts) {
        return new TallyUpdated(slideId, Map.copyOf(optionCounts));
    }

    /**
     * The Q&amp;A round's full question list (a question arrived or a host answer
     * changed). {@code questions} must already be participant-safe — built via
     * {@link QAndAQuestionView#from}, which drops the asker on anonymised rounds.
     */
    public static QAndAUpdated qAndAUpdated(String slideId, List<QAndAQuestionView> questions) {
        return new QAndAUpdated(slideId, List.copyOf(questions));
    }

    /** Submissions closed with nothing revealed (entered LOCKED) — carries no counts. */
    public static SubmissionsLocked submissionsLocked(String slideId) {
        return new SubmissionsLocked(slideId);
    }

    /**
     * Best-answer voting opened (entered VOTE): submissions closed unscored and the
     * anonymised options are up for votes. {@code options} must already be
     * participant-safe — opaque ids only, built by the orchestrator from the
     * server-side option mapping (D3).
     */
    public static VotingOpened votingOpened(String slideId, List<VoteOptionView> options) {
        return new VotingOpened(slideId, List.copyOf(options));
    }

    /** A vote landed (or changed): the running count of votes cast, never per-option tallies. */
    public static VoteCast voteCast(String slideId, int votesCast) {
        return new VoteCast(slideId, votesCast);
    }

    /** Response distribution shown, closed (entered REVEAL_RESPONSES). */
    public static ResponsesRevealed responsesRevealed(String slideId, Map<String, Integer> optionCounts) {
        return new ResponsesRevealed(slideId, Map.copyOf(optionCounts));
    }

    /**
     * Scored results for a round (combined parent+child for a follow-up; entered
     * REVEAL_RESULTS). Reuses the round's {@link RoundResult} for outcomes/counts and
     * builds the standings from the supplied roster. {@code drawings} is the
     * submitted-drawings gallery for a Drawing round, {@code null} otherwise;
     * {@code placeTargets} is the correct-location circles for a Place-on-image
     * round, {@code null} otherwise; {@code allocationTargets} is the authored
     * per-option point key for an Allocation round, {@code null} otherwise.
     */
    public static ResultsRevealed resultsRevealed(RoundResult result, List<Participant> roster,
            List<DrawingSubmissionView> drawings, List<PlaceTargetView> placeTargets,
            List<AllocationTargetView> allocationTargets, boolean terminal) {
        return new ResultsRevealed(
                result.id().slideId(),
                List.copyOf(result.perParticipant()),
                Map.copyOf(result.optionCounts()),
                result.correctOption().orElse(null),
                scoreboard(roster),
                drawings == null ? null : List.copyOf(drawings),
                placeTargets == null ? null : List.copyOf(placeTargets),
                allocationTargets == null ? null : List.copyOf(allocationTargets),
                terminal);
    }

    /**
     * The same {@code REVEAL_RESULTS} transition with an empty payload, for a round
     * that closed with no persisted {@link RoundResult} — Redis round state and the
     * Mongo results store have drifted (a reseeded database, or an earlier persist
     * that failed). There is nothing to score, but the phase moved, so an event must
     * still go out: no persisted lifecycle transition without a published event.
     *
     * <p>Carries the live scoreboard and {@code terminal} so the board can still
     * reach the podium; the round-specific payloads (outcomes, counts, answer key,
     * drawings, place targets, allocation targets) are empty or absent because no
     * record exists.
     */
    public static ResultsRevealed resultsRevealedWithoutRecord(String slideId, List<Participant> roster,
            boolean terminal) {
        return new ResultsRevealed(slideId, List.of(), Map.of(), null, scoreboard(roster), null, null, null, terminal);
    }

    /** The fresh reopened round, read off the just-saved state (slide id, phase, start, deadline). */
    public static RoundRestarted roundRestarted(LiveRoundState state) {
        return new RoundRestarted(state.currentSlideId(), state.phase(), state.roundStartedAt(), state.deadline());
    }

    /**
     * The round timer paused (host action or host-disconnect auto-pause), read off
     * the just-saved paused state.
     */
    public static TimerPaused timerPaused(LiveRoundState state) {
        return new TimerPaused(state.currentSlideId(), state.pausedAt(), state.deadline());
    }

    /** The round timer running again, read off the just-saved resumed state. */
    public static TimerResumed timerResumed(LiveRoundState state) {
        return new TimerResumed(state.currentSlideId(), state.deadline());
    }

    public static LiveSessionEnded liveSessionEnded(List<Participant> roster) {
        return new LiveSessionEnded(scoreboard(roster));
    }

    public static LiveSessionCancelled liveSessionCancelled(String reason) {
        return new LiveSessionCancelled(reason);
    }

    /** Sorts the roster by points (desc) and assigns 1-based ranks. */
    public static List<ScoreboardEntry> scoreboard(List<Participant> roster) {
        List<Participant> sorted = roster.stream()
                .sorted(Comparator.comparingInt(SessionEvents::points).reversed())
                .toList();
        List<ScoreboardEntry> entries = new java.util.ArrayList<>(sorted.size());
        for (int i = 0; i < sorted.size(); i++) {
            Participant p = sorted.get(i);
            entries.add(new ScoreboardEntry(p.getParticipantId(), p.getDisplayName(), points(p), i + 1));
        }
        return List.copyOf(entries);
    }

    private static int points(Participant p) {
        ParticipantScore score = p.getScore();
        return score == null ? 0 : score.getPoints();
    }
}
