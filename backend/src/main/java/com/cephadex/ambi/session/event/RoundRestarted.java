package com.cephadex.ambi.session.event;

import java.time.Instant;

import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * A round was reopened from scratch — fresh start time, prior answers/tally
 * cleared. {@code deadline} is the fresh auto-close instant for a timed round
 * (ADR 002), {@code null} for an untimed one.
 */
public record RoundRestarted(String slideId, RoundPhase phase, Instant roundStartedAt, Instant deadline)
        implements SessionEvent {
}
