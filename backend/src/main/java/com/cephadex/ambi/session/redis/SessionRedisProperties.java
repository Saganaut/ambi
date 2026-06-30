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
    private final RoundState roundState = new RoundState();
    private final Tally tally = new Tally();
    private final Answers answers = new Answers();
    private final Presence presence = new Presence();
    private final Events events = new Events();

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
    public static class RoundState {
        /** Redis key namespace for the in-flight round-state snapshot. */
        private String namespace = "ambi:session:roundstate";
        /**
         * TTL on the in-flight round-state record — a backstop so abandoned
         * sessions don't linger in Redis forever. Refreshed on every save.
         */
        private Duration ttl = Duration.ofHours(6);
    }

    @Data
    public static class Tally {
        /**
         * Redis key namespace for per-round option tallies. Each round's tally is
         * a Redis Hash at {@code <namespace>:<sessionId>:<slideId>}, bumped with
         * native {@code HINCRBY} so concurrent submissions don't contend on the
         * session lock the way a tally embedded in the state snapshot would.
         */
        private String namespace = "ambi:session:tally";
        /**
         * TTL on a round's tally hash — the same abandoned-session backstop as the
         * state TTL. Refreshed on every increment.
         */
        private Duration ttl = Duration.ofHours(6);
    }

    @Data
    public static class Answers {
        /**
         * Redis key namespace for a round's in-flight answers. Each round's answers
         * are a Redis Hash at {@code <namespace>:<sessionId>:<slideId>}, one field
         * per participant (re-submit overwrites), flushed to MongoDB at round close.
         */
        private String namespace = "ambi:session:answers";
        /**
         * TTL on a round's answer hash — the same abandoned-session backstop as the
         * state TTL. Refreshed on every submit.
         */
        private Duration ttl = Duration.ofHours(6);
    }

    @Data
    public static class Presence {
        /**
         * Redis key namespace for a session's live participant presence. Presence is
         * a Redis Hash at {@code <namespace>:<sessionId>}, one field per participant
         * (connection status + last-seen), so a session's roster presence reads in a
         * single round-trip.
         */
        private String namespace = "ambi:session:presence";
        /**
         * TTL on a session's presence hash — the same abandoned-session backstop as
         * the state TTL. Refreshed on every write.
         */
        private Duration ttl = Duration.ofHours(6);
    }

    @Data
    public static class Events {
        /**
         * Redis pub/sub channel that carries session events across app instances. The
         * orchestrator publishes here via {@code RedisEventPublisher}; a
         * {@code LiveSessionStompRelay} on every instance subscribes and re-broadcasts
         * each event to its locally-connected STOMP subscribers. A single shared
         * channel (not one per session) — the envelope carries the {@code publicId} the
         * relay routes on, so every instance receives every event and forwards only to
         * its own subscribers.
         */
        private String channel = "ambi:session:events";
    }
}
