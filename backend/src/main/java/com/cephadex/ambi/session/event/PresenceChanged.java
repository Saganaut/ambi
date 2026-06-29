package com.cephadex.ambi.session.event;

import java.time.Instant;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;

/** A participant's live connection state changed (online / disconnected / idle / reconnecting). */
public record PresenceChanged(String participantId, ConnectionStatus status, Instant lastSeenAt)
        implements SessionEvent {
}
