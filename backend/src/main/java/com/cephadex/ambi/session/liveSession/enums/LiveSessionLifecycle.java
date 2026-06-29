package com.cephadex.ambi.session.liveSession.enums;

/**
 * The coarse, durable lifecycle of a live session. The fine-grained "where in the
 * round are we" state is owned by {@code RoundPhase} in Redis — including the
 * end-of-game results view, which is the last slide sitting in
 * {@code RoundPhase.REVEAL_RESULTS} while the session is still {@code IN_PROGRESS}.
 * There is deliberately no session-level {@code RESULTS} status: finishing is an
 * explicit host action ({@code FINISHED}); the "final podium" is a derived view
 * signalled by the round being the terminal one, not a stored status.
 */
public enum LiveSessionLifecycle {
    LOBBY,
    IN_PROGRESS,
    FINISHED,
    CANCELLED
}
