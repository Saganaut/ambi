package com.cephadex.ambi.session.event;

import java.time.Instant;

/**
 * The open timed round's auto-close timer was paused (ADR 002) — by the host,
 * or automatically on host presence loss (F5). Submissions stay open; only the
 * countdown freezes. {@code deadline} is the deadline as it stood at the pause,
 * so the frozen remaining time is {@code deadline - pausedAt}; the real
 * deadline shifts out again when {@link TimerResumed} arrives.
 */
public record TimerPaused(String slideId, Instant pausedAt, Instant deadline) implements SessionEvent {
}
