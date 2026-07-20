package com.cephadex.ambi.session.redis;

import java.time.Duration;
import java.time.Instant;

import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * The volatile state of a session's current round, kept in Redis for fast
 * read-modify-write while a round is live. Deliberately separate from the
 * {@code LiveSession} Mongo document: that aggregate carries the persistent
 * snapshot and its {@code @Field} mappings, whereas this record is the
 * Redis-JSON shape and is free to change without touching the database schema.
 *
 * <p>This is the host-driven <em>control</em> record — which slide is open, the
 * round phase, when it started — read-modify-written under the session lock. The
 * per-option submission counts live separately in {@link TallyStore}: they're
 * bumped once per participant submission, so keeping them here would force every
 * submission through the session lock and a whole-blob rewrite.
 *
 * <p>A record (immutable): mutations go through the {@code with*} copy helpers so
 * a value handed to the store can't be aliased and changed underneath it.
 *
 * <p>{@code publicId} rides along so a round transition — which already
 * read-modify-writes this snapshot under the lock — has the session's public
 * handle on hand to address the event topic ({@code /topic/liveSession/{publicId}})
 * without a separate Mongo read. It is {@code null} only for the publicId-less
 * {@link #idle()} fallback used when no seeded state exists yet.
 *
 * <h2>Round timer (ADR 002)</h2>
 * A timed round carries {@code durationMs} (from the slide's resolved
 * {@code countdownTime}); an untimed slide leaves it {@code null} and keeps the
 * host-driven behavior. The effective auto-close deadline is
 * {@code roundStartedAt + durationMs + accumulatedPauseMs} ({@link #deadline()}).
 * Pausing stamps {@code pausedAt}; resuming folds the pause into
 * {@code accumulatedPauseMs} and clears the stamp — so while paused,
 * {@code deadline() - pausedAt} is the frozen remaining time.
 *
 * @param publicId           the session's public handle (the event topic key); {@code null} for the bare {@link #idle()} fallback
 * @param phase              whether the round is taking submissions or revealing
 * @param currentSlideId     the slide the round is running, or {@code null} between rounds
 * @param roundStartedAt     when the current round opened (used for response timing); {@code null} between rounds
 * @param durationMs         the round's timer length, or {@code null} for an untimed (host-driven) round
 * @param pausedAt           when the timer was paused, or {@code null} while it is running
 * @param accumulatedPauseMs total time already spent paused (folded in on each resume)
 */
public record LiveRoundState(
        String publicId,
        RoundPhase phase,
        String currentSlideId,
        Instant roundStartedAt,
        Long durationMs,
        Instant pausedAt,
        long accumulatedPauseMs) {

    /** The state of a session with no round in progress yet, with no public handle bound. */
    public static LiveRoundState idle() {
        return new LiveRoundState(null, RoundPhase.SUBMIT, null, null, null, null, 0L);
    }

    /** The idle state for a session, carrying its {@code publicId} so later transitions can address events. */
    public static LiveRoundState idle(String publicId) {
        return new LiveRoundState(publicId, RoundPhase.SUBMIT, null, null, null, null, 0L);
    }

    /**
     * Returns a copy that has opened {@code slideId} at {@code startedAt} in the
     * given initial phase — {@link RoundPhase#SUBMIT} normally, or
     * {@link RoundPhase#SUBMIT_LIVE} when the slide's display mode opens live.
     * {@code durationMs} arms the auto-close timer; {@code null} opens untimed.
     * Any prior round's pause bookkeeping is reset.
     */
    public LiveRoundState startedRound(String slideId, Instant startedAt, RoundPhase phase, Long durationMs) {
        return new LiveRoundState(publicId, phase, slideId, startedAt, durationMs, null, 0L);
    }

    /** Returns a copy switched to the given phase, leaving slide/timing intact. */
    public LiveRoundState withPhase(RoundPhase newPhase) {
        return new LiveRoundState(publicId, newPhase, currentSlideId, roundStartedAt, durationMs, pausedAt,
                accumulatedPauseMs);
    }

    /** Whether the open round has an auto-close timer. */
    public boolean timed() {
        return durationMs != null;
    }

    /** Whether the timer is currently paused. */
    public boolean isPaused() {
        return pausedAt != null;
    }

    /**
     * The auto-close deadline: {@code roundStartedAt + durationMs +
     * accumulatedPauseMs}, or {@code null} for an untimed round (or no open
     * round). While paused this is the deadline as if the timer resumed at the
     * pause instant — the remaining time frozen on the clock is
     * {@code deadline() - pausedAt}; the real deadline shifts again on resume.
     */
    public Instant deadline() {
        if (durationMs == null || roundStartedAt == null) {
            return null;
        }
        return roundStartedAt.plusMillis(durationMs + accumulatedPauseMs);
    }

    /** Returns a copy with the timer paused as of {@code now}. */
    public LiveRoundState paused(Instant now) {
        return new LiveRoundState(publicId, phase, currentSlideId, roundStartedAt, durationMs, now,
                accumulatedPauseMs);
    }

    /**
     * Returns a copy with the timer running again as of {@code now}: the elapsed
     * pause is folded into {@code accumulatedPauseMs} (pushing {@link #deadline()}
     * out by the same amount) and the pause stamp cleared.
     */
    public LiveRoundState resumed(Instant now) {
        long pauseMs = pausedAt == null ? 0L : Duration.between(pausedAt, now).toMillis();
        return new LiveRoundState(publicId, phase, currentSlideId, roundStartedAt, durationMs, null,
                accumulatedPauseMs + Math.max(0L, pauseMs));
    }
}
