package com.cephadex.ambi.session.event;

/**
 * Static classification of a {@link SessionEvent}, assigned once per event type
 * by {@link SessionEvent#kind()}.
 *
 * <p><strong>No runtime effect today.</strong> Nothing on the publish, relay, or
 * snapshot path branches on this — it is the seam the deferred durable event log
 * will filter on (see
 * {@code z-docs/features/live-session-events.md} §"Deferred: durable event log"):
 * {@link #LIFECYCLE} events are worth persisting and replaying, {@link #EPHEMERAL}
 * ones are superseded state replacements that a snapshot re-derives anyway.
 */
public enum SessionEventKind {

    /**
     * A session or round transition — started, round opened, submissions locked,
     * results revealed, ended… Each one is a distinct, non-repeatable step in the
     * session's history, so a log would keep every occurrence.
     */
    LIFECYCLE,

    /**
     * A high-frequency state replacement whose latest value fully supersedes the
     * previous one (running tallies, vote counts, presence, the Q&amp;A question
     * list). Dropping all but the newest loses nothing a snapshot can't rebuild,
     * so a log would skip them.
     */
    EPHEMERAL
}
