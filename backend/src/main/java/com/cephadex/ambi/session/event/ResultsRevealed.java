package com.cephadex.ambi.session.event;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.session.SessionTypes.ParticipantOutcome;
import com.cephadex.ambi.session.event.dto.ScoreboardEntry;

/**
 * The round entered
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#REVEAL_RESULTS
 * REVEAL_RESULTS}: the scored results are shown. For a follow-up child round these
 * are the combined parent+child results. {@code terminal} is {@code true} when this
 * is the last round, the cue for the client to show the final podium (there is no
 * session-level results status — open-decisions B2).
 *
 * <p>{@code outcomes} reuses {@link ParticipantOutcome}, which is already
 * participant-safe (keyed by {@code participantId}). {@code correctOption} is the
 * revealed answer key for this slide — disclosed only now, at results time.
 */
public record ResultsRevealed(
        String slideId,
        List<ParticipantOutcome> outcomes,
        Map<String, Integer> optionCounts,
        String correctOption,
        List<ScoreboardEntry> scoreboard,
        boolean terminal) implements SessionEvent {
}
