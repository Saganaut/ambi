package com.cephadex.ambi.session.event;

/**
 * A participant left the session — a <strong>delta</strong> carrying only the
 * departed id, for the same reasons as {@link ParticipantJoined}.
 */
public record ParticipantLeft(String participantId) implements SessionEvent {
}
