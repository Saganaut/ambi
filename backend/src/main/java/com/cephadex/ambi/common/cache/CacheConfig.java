package com.cephadex.ambi.common.cache;

import java.time.Duration;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.cache.autoconfigure.RedisCacheManagerBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.serializer.GenericJacksonJsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext.SerializationPair;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.jsontype.BasicPolymorphicTypeValidator;
import tools.jackson.databind.jsontype.PolymorphicTypeValidator;

/**
 * Wires the Redis-backed Spring Cache layer. Deliberately provides a base
 * {@link RedisCacheConfiguration} plus a {@link RedisCacheManagerBuilderCustomizer}
 * rather than a hand-built {@code RedisCacheManager} bean: an explicit manager
 * makes Boot's cache auto-configuration back off, which would turn
 * {@code spring.cache.type=none} into a no-op (tests would still cache). Letting
 * Boot own the manager keeps that test kill-switch real ({@code none} yields a
 * {@code NoOpCacheManager}). Reuses the auto-configured {@code RedisConnectionFactory}.
 *
 * <p>Values carry {@code @class} type info via the Jackson 3
 * {@link GenericJacksonJsonRedisSerializer} (the unversioned class is the Jackson 3
 * one — its constructor takes a {@code tools.jackson} mapper), so the mutable
 * {@code User} document round-trips robustly; keys are plain strings under the
 * {@code ambi:cache:} prefix. The mapper follows the same conventions as
 * {@link com.cephadex.ambi.common.redis.RedisJsonCodec} (ISO-8601 dates,
 * forward-compatible reads).
 */
@Configuration
@ConditionalOnProperty(prefix = "ambi.cache", name = "enabled", matchIfMissing = true)
public class CacheConfig {

    /**
     * Cache values embed a {@code @class} discriminator so they deserialize back to
     * the concrete type (e.g. {@code User}) rather than a bare {@code LinkedHashMap}.
     * Default typing is restricted to Ambi's own types plus the JDK containers and
     * temporals we actually store — never open-ended — so a poisoned cache entry
     * can't drive Jackson to instantiate an arbitrary gadget class.
     */
    private static final PolymorphicTypeValidator CACHE_TYPES = BasicPolymorphicTypeValidator.builder()
            .allowIfSubType("com.cephadex.ambi.")
            .allowIfSubType("java.util.")
            .allowIfSubType("java.time.")
            .build();

    /**
     * Jackson 3 value serializer that writes {@code @class} type info. Mirrors
     * {@code RedisJsonCodec}'s conventions (ISO-8601 dates, forward-compatible reads)
     * via {@code customize}, and teaches the serializer Spring's {@code NullValue}
     * sentinel so caching a miss works where a cache allows it.
     */
    private static GenericJacksonJsonRedisSerializer valueSerializer() {
        return GenericJacksonJsonRedisSerializer.builder()
                .enableSpringCacheNullValueSupport()
                .enableDefaultTyping(CACHE_TYPES)
                .customize(mapper -> mapper
                        .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)         // ISO-8601 text
                        .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)) // tolerate added fields
                .build();
    }

    private static RedisCacheConfiguration base(String prefix, Duration ttl, boolean allowNullValues) {
        RedisCacheConfiguration cfg = RedisCacheConfiguration.defaultCacheConfig()
                .prefixCacheNameWith(prefix)                                 // -> ambi:cache:<name>::<key>
                .entryTtl(ttl)
                .serializeKeysWith(SerializationPair.fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(SerializationPair.fromSerializer(valueSerializer()));
        return allowNullValues ? cfg : cfg.disableCachingNullValues();
    }

    /** Default config applied to any cache without a specific override. */
    @Bean
    RedisCacheConfiguration cacheConfiguration(CacheProperties props) {
        return base(props.getKeyPrefix(), props.getDefaultTtl(), true);
    }

    /** Per-cache TTL + null-value overrides. Boot applies this to the auto-built manager. */
    @Bean
    RedisCacheManagerBuilderCustomizer ambiCacheCustomizer(CacheProperties props) {
        String prefix = props.getKeyPrefix();
        CacheProperties.Users users = props.getUsers();
        CacheProperties.UsersByIdentity byIdentity = props.getUsersByIdentity();
        return builder -> builder
                .withCacheConfiguration(CacheNames.USERS,
                        base(prefix, users.getTtl(), users.isCacheNullValues()))
                .withCacheConfiguration(CacheNames.USERS_BY_IDENTITY,
                        base(prefix, byIdentity.getTtl(), byIdentity.isCacheNullValues()));
    }
}
