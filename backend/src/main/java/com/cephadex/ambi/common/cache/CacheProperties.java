package com.cephadex.ambi.common.cache;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;

import lombok.Data;

/**
 * Strongly-typed configuration for the Redis-backed Spring Cache layer (prefix
 * {@code ambi.cache}). Mirrors {@code SessionRedisProperties}: config, not a wire
 * DTO, so a Lombok class with overridable per-environment defaults. Bound by the
 * existing {@code @ConfigurationPropertiesScan} on {@code AmbiApplication}.
 *
 * <p>The real on/off switch for caching is Spring's {@code spring.cache.type}
 * ({@code none} yields a NoOp manager and disables it entirely — used in tests).
 * {@link #enabled} here is a secondary guard that gates {@link CacheConfig} via
 * {@code @ConditionalOnProperty}.
 */
@Data
@ConfigurationProperties(prefix = "ambi.cache")
public class CacheProperties {

    /** Secondary kill-switch that gates {@link CacheConfig}. The real toggle is {@code spring.cache.type}. */
    private boolean enabled = true;

    /**
     * Key prefix for every cache entry. Combined with the cache name it yields
     * {@code ambi:cache:<cacheName>::<key>}, keeping cache keys inside the shared
     * {@code ambi:} keyspace and clear of the auth-session ({@code ambi:userSession:*})
     * and live-session ({@code ambi:session:*}) keys.
     */
    private String keyPrefix = "ambi:cache:";

    /** Fallback TTL for any cache without an explicit override below. */
    private Duration defaultTtl = Duration.ofMinutes(10);

    private final Users users = new Users();
    private final UsersByIdentity usersByIdentity = new UsersByIdentity();

    @Data
    public static class Users {
        /** TTL for {@code findById} / {@code requireUser} entries, keyed by user id. */
        private Duration ttl = Duration.ofMinutes(10);
        /**
         * Cache a missing id as a NullValue tombstone. Safe here: ids are
         * Mongo-generated, so a not-yet-existing id is never queried before it
         * exists. Left on to absorb repeated misses.
         */
        private boolean cacheNullValues = true;
    }

    @Data
    public static class UsersByIdentity {
        /**
         * TTL for {@code findByProviderAndSubject} entries, keyed by
         * {@code provider:externalProviderId}. Short by design — a login-burst
         * absorber, not a source of truth — so a missed eviction self-heals fast.
         */
        private Duration ttl = Duration.ofMinutes(2);
        /**
         * MUST stay false: caching {@code Optional.empty()} for an identity that is
         * about to {@code register} would strand a stale "no such user" tombstone on
         * the login path. Paired with {@code unless="#result == null"} on the read
         * method (which also stops {@code RedisCache.put(key, null)} from throwing).
         */
        private boolean cacheNullValues = false;
    }
}
