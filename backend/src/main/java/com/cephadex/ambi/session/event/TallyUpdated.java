package com.cephadex.ambi.session.event;

import java.util.Map;

import com.cephadex.ambi.session.event.SessionEvent;

/**
 * The live per-option submission counts for the open round changed (one or more
 * answers came in). The pre-reveal bar-chart source; counts are keyed by option
 * id.
 */
public record TallyUpdated(String slideId, Map<String, Integer> optionCounts) implements SessionEvent {
}
