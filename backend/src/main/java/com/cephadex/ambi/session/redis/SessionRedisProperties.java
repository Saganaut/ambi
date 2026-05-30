package com.cephadex.ambi.session.redis;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * Strongly-typed configuration for the live-session Redis layer (prefix
 * {@code ambi.session}). Mirrors {@code AuthProperties}: this is config, not a
 * wire DTO, so it's a Lombok class rather than a record, and the defaults are
 * overridable per environment. Bound by the existing
 * {@code @ConfigurationPropertiesScan} on {@code AmbiApplication}.
 */
@Data
@ConfigurationProperties(prefix = "ambi.session")
public class SessionRedisProperties {

    private final Lock lock = new Lock();
    private final State state = new State();

    @Data
    public static class Lock {
        /** Redis key namespace for per-session locks. */
        private String namespace = "ambi:session:lock";
        /**
         * Lease TTL on a held lock. A crashed holder's lock self-expires after
         * this window so the session can't deadlock; it must comfortably exceed
         * the longest single locked operation.
         */
        private Duration lease = Duration.ofSeconds(10);
    }

    @Data
    public static class State {
        /** Redis key namespace for the in-flight round-state snapshot. */
        private String namespace = "ambi:session:state";
        /**
         * TTL on the in-flight state record — a backstop so abandoned sessions
         * don't linger in Redis forever. Refreshed on every save.
         */
        private Duration ttl = Duration.ofHours(6);
    }
}
