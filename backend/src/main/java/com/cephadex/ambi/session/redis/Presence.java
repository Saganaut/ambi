package com.cephadex.ambi.session.redis;

import java.time.Instant;

import com.cephadex.ambi.session.participant.enums.ConnectionStatus;

/**
 * A participant's live connection state within a session — the volatile half of
 * {@code Participant} that changes on every heartbeat and socket event, kept in
 * Redis ({@link PresenceStore}) rather than written through to the
 * {@code Participant} document on each beat.
 *
 * <p>A record (immutable): the Redis-JSON shape of one presence entry. Status
 * transitions (heartbeat → {@link ConnectionStatus#ONLINE}, socket close →
 * {@link ConnectionStatus#DISCONNECTED}, idle decay) are decided by the caller —
 * the store only persists the resulting value, the same way {@code LiveRoundState}
 * transitions live in the orchestrator and not in {@code SessionStateStore}.
 *
 * @param status     the participant's current connection status
 * @param lastSeenAt when the participant was last heard from (heartbeat or event)
 */
public record Presence(ConnectionStatus status, Instant lastSeenAt) {

    /** A freshly-seen, online presence as of {@code seenAt}. */
    public static Presence online(Instant seenAt) {
        return new Presence(ConnectionStatus.ONLINE, seenAt);
    }
}
