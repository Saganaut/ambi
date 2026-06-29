package com.cephadex.ambi.session.event;

import java.time.Instant;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/** A round was reopened from scratch — fresh start time, prior answers/tally cleared. */
public record RoundRestarted(String slideId, RoundPhase phase, Instant roundStartedAt) implements SessionEvent {
}
