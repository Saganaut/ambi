package com.cephadex.ambi.session.redis;

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
 * @param phase          whether the round is taking submissions or revealing
 * @param currentSlideId the slide the round is running, or {@code null} between rounds
 * @param roundStartedAt when the current round opened (used for response timing); {@code null} between rounds
 */
public record LiveRoundState(
        RoundPhase phase,
        String currentSlideId,
        Instant roundStartedAt) {

    /** The state of a session with no round in progress yet. */
    public static LiveRoundState idle() {
        return new LiveRoundState(RoundPhase.SUBMIT, null, null);
    }

    /** Returns a copy that has opened {@code slideId} at {@code startedAt} in the SUBMIT phase. */
    public LiveRoundState startedRound(String slideId, Instant startedAt) {
        return new LiveRoundState(RoundPhase.SUBMIT, slideId, startedAt);
    }

    /** Returns a copy switched to the given phase, leaving slide/timing intact. */
    public LiveRoundState withPhase(RoundPhase newPhase) {
        return new LiveRoundState(newPhase, currentSlideId, roundStartedAt);
    }
}
