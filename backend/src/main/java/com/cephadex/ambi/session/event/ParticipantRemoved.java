package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.participant.enums.RemovalReason;

/**
 * A participant was removed by the host — {@link RemovalReason#KICKED} or
 * {@link RemovalReason#BANNED} — as opposed to leaving voluntarily
 * ({@link ParticipantLeft}). Carries the updated roster.
 */
public record ParticipantRemoved(String participantId, RemovalReason reason, List<String> roster)
        implements SessionEvent {
}
