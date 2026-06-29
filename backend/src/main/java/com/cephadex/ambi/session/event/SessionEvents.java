package com.cephadex.ambi.session.event;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantScore;
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

    public static PlayStarted playStarted(LiveSession session) {
        return new PlayStarted(session.getStatus(), session.getPhase());
    }

    public static ParticipantJoined participantJoined(Participant participant, List<String> roster) {
        return new ParticipantJoined(ParticipantView.from(participant), List.copyOf(roster));
    }

    public static ParticipantLeft participantLeft(String participantId, List<String> roster) {
        return new ParticipantLeft(participantId, List.copyOf(roster));
    }

    public static PresenceChanged presenceChanged(String participantId, Presence presence) {
        return new PresenceChanged(participantId, presence.status(), presence.lastSeenAt());
    }

    /** Round opened on {@code slide}; reads the slide id/phase/start time from the round state. */
    public static RoundOpened roundOpened(LiveRoundState state, Slide slide) {
        return new RoundOpened(state.currentSlideId(), com.cephadex.ambi.session.event.dto.SlideView.from(slide),
                state.phase(), state.roundStartedAt());
    }

    public static TallyUpdated tallyUpdated(String slideId, Map<String, Integer> optionCounts) {
        return new TallyUpdated(slideId, Map.copyOf(optionCounts));
    }

    public static ResponsesRevealed responsesRevealed(String slideId, RoundPhase phase,
            Map<String, Integer> optionCounts) {
        return new ResponsesRevealed(slideId, phase, Map.copyOf(optionCounts));
    }

    /**
     * Scored results for a round (combined parent+child for a follow-up). Reuses
     * the round's {@link RoundResult} for outcomes/counts and builds the standings
     * from the supplied roster.
     */
    public static ResultsRevealed resultsRevealed(RoundResult result, RoundPhase phase,
            List<Participant> roster, boolean terminal) {
        return new ResultsRevealed(
                result.id().slideId(),
                phase,
                List.copyOf(result.perParticipant()),
                Map.copyOf(result.optionCounts()),
                result.correctOption().orElse(null),
                scoreboard(roster),
                terminal);
    }

    public static RoundRestarted roundRestarted(String slideId, RoundPhase phase, Instant roundStartedAt) {
        return new RoundRestarted(slideId, phase, roundStartedAt);
    }

    public static SessionEnded sessionEnded(List<Participant> roster) {
        return new SessionEnded(scoreboard(roster));
    }

    public static SessionCancelled sessionCancelled(String reason) {
        return new SessionCancelled(reason);
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
