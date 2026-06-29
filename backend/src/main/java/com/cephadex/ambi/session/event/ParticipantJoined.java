package com.cephadex.ambi.session.event;

import java.util.List;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.dto.ParticipantView;

/**
 * A participant joined the session. Carries the new participant's view and the
 * full updated roster (participant ids) so a client can reconcile in one event.
 */
public record ParticipantJoined(ParticipantView participant, List<String> roster) implements SessionEvent {
}
