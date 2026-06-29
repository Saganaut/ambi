package com.cephadex.ambi.session.event;

import java.util.Map;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * Submissions closed and the collected responses are shown (phase
 * {@code REVEAL_RESPONSES}) — the answers/tally are visible but the round is not
 * yet scored. Counts are keyed by option id.
 */
public record ResponsesRevealed(String slideId, RoundPhase phase, Map<String, Integer> optionCounts)
        implements SessionEvent {
}
