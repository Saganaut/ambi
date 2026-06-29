package com.cephadex.ambi.session.event;

import java.util.Map;

import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * Submissions were closed on the current round. The resulting {@code phase}
 * preserves whatever was on display: {@code LOCKED} (was hidden) or
 * {@code REVEAL_RESPONSES} (was live). {@code optionCounts} is populated only when
 * the phase shows responses — a hidden lock carries an empty map so it leaks
 * nothing.
 */
public record SubmissionsClosed(String slideId, RoundPhase phase, Map<String, Integer> optionCounts)
        implements SessionEvent {
}
