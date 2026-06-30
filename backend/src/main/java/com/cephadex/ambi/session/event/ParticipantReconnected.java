package com.cephadex.ambi.session.event;

import com.cephadex.ambi.session.event.dto.ParticipantView;

/**
 * A participant rejoined an in-progress session after dropping. Carries the
 * refreshed {@link ParticipantView} so other clients can mark them back online and
 * pick up any score/profile changes. Distinct from the generic heartbeat
 * {@link PresenceChanged}.
 */
public record ParticipantReconnected(ParticipantView participant) implements SessionEvent {
}
