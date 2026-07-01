package com.cephadex.ambi.session.event;

import java.util.List;


/** A participant left the session. Carries the departed id and the updated roster. */
public record ParticipantLeft(String participantId, List<String> roster) implements SessionEvent {
}
