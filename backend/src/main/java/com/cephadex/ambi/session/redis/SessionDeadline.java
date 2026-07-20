package com.cephadex.ambi.session.redis;

import java.util.Objects;

/**
 * One pending scheduler-fired transition, stored as a member of the global
 * deadline ZSET (ADR 002) with its due time as the score. The member string
 * encodes the kind and the target — {@code close:{sessionId}:{slideId}},
 * {@code hostAway:{sessionId}}, {@code graceCancel:{sessionId}} — so the
 * scheduler can dispatch a popped entry without any further lookup. Ids are
 * Mongo/UUID identifiers and never contain {@code ':'}, so the encoding splits
 * unambiguously.
 *
 * @param kind      what firing this deadline does
 * @param sessionId the session the deadline belongs to
 * @param slideId   the round's slide for {@link Kind#CLOSE_ROUND}; {@code null} for the host-liveness kinds
 */
public record SessionDeadline(Kind kind, String sessionId, String slideId) {

    /** What the scheduler does when a deadline of this kind comes due. */
    public enum Kind {
        /** Auto-close the round's submissions (the timer expiring). */
        CLOSE_ROUND("close"),
        /** The host has not been seen for the offline threshold — auto-pause + start the grace countdown. */
        HOST_AWAY("hostAway"),
        /** The disconnected host's grace ran out — cancel the session. */
        GRACE_CANCEL("graceCancel");

        private final String prefix;

        Kind(String prefix) {
            this.prefix = prefix;
        }
    }

    /** The round auto-close deadline for {@code (sessionId, slideId)}. */
    public static SessionDeadline closeRound(String sessionId, String slideId) {
        return new SessionDeadline(Kind.CLOSE_ROUND,
                Objects.requireNonNull(sessionId, "sessionId required"),
                Objects.requireNonNull(slideId, "slideId required"));
    }

    /** The host-liveness deadline for the session (fires when host presence goes stale). */
    public static SessionDeadline hostAway(String sessionId) {
        return new SessionDeadline(Kind.HOST_AWAY,
                Objects.requireNonNull(sessionId, "sessionId required"), null);
    }

    /** The host-disconnect grace deadline for the session (fires into a cancel). */
    public static SessionDeadline graceCancel(String sessionId) {
        return new SessionDeadline(Kind.GRACE_CANCEL,
                Objects.requireNonNull(sessionId, "sessionId required"), null);
    }

    /** The ZSET member string this deadline is stored as. */
    public String member() {
        return slideId == null
                ? kind.prefix + ":" + sessionId
                : kind.prefix + ":" + sessionId + ":" + slideId;
    }

    /**
     * Parses a ZSET member back into a deadline, or {@code null} for a malformed
     * or unknown-kind member (the caller logs and drops it rather than crashing
     * the poll on a stray entry).
     */
    public static SessionDeadline parse(String member) {
        if (member == null) {
            return null;
        }
        String[] parts = member.split(":");
        for (Kind kind : Kind.values()) {
            if (!parts[0].equals(kind.prefix)) {
                continue;
            }
            boolean wantsSlide = kind == Kind.CLOSE_ROUND;
            if (wantsSlide ? parts.length != 3 : parts.length != 2) {
                return null;
            }
            return new SessionDeadline(kind, parts[1], wantsSlide ? parts[2] : null);
        }
        return null;
    }
}
