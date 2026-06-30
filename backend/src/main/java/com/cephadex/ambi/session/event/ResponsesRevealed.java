package com.cephadex.ambi.session.event;

import java.util.Map;

/**
 * The round entered
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#REVEAL_RESPONSES
 * REVEAL_RESPONSES}: submissions are closed and the response distribution is
 * shown, not yet scored. Reached either by revealing after a hidden lock or by
 * closing a live round. Counts are keyed by option id.
 */
public record ResponsesRevealed(String slideId, Map<String, Integer> optionCounts) implements SessionEvent {
}
