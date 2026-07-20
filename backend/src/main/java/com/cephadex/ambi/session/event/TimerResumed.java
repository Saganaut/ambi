package com.cephadex.ambi.session.event;

import java.time.Instant;

/**
 * The paused round timer is running again (ADR 002). {@code deadline} is the
 * recomputed auto-close instant (the elapsed pause folded in) — clients re-seed
 * their countdown from it.
 */
public record TimerResumed(String slideId, Instant deadline) implements SessionEvent {
}
