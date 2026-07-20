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
    private final QandaHostAnswers qandaHostAnswers = new QandaHostAnswers();
    private final Presence presence = new Presence();
    private final Events events = new Events();
    private final Deadlines deadlines = new Deadlines();

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
    public static class QandaHostAnswers {
        /**
         * Redis key namespace for a Q&amp;A round's host-typed answers. Each round's
         * host answers are a Redis Hash at {@code <namespace>:<sessionId>:<slideId>},
         * one field per question id. Runtime-only — never flushed to MongoDB.
         */
        private String namespace = "ambi:session:qa-host-answers";
        /**
         * TTL on a round's host-answer hash — the same abandoned-session backstop as
         * the state TTL. Refreshed on every write.
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
    public static class Deadlines {
        /**
         * Key of the single global deadline ZSET (ADR 002): one entry per pending
         * scheduler-fired transition ({@code score = deadline epochMillis}, member =
         * a {@link SessionDeadline}). Global rather than per-session so the leader
         * polls one key instead of scanning a keyspace.
         */
        private String key = "ambi:session:deadlines";
        /**
         * Key of the scheduler-leader lease. Exactly one app instance holds it at a
         * time (SET NX PX + compare-and-renew) and polls the deadline ZSET, so two
         * instances never race to fire the same deadline.
         */
        private String leaderKey = "ambi:session:deadline-leader";
        /**
         * TTL on the leader lease. A crashed leader's lease self-expires after this
         * window and another instance takes over; it must comfortably exceed the
         * poll interval so a healthy leader never loses its own lease between polls.
         */
        private Duration leaderLease = Duration.ofSeconds(15);
        /**
         * How often the leader polls the ZSET for due deadlines — the upper bound on
         * how late an auto-close fires past its deadline. Read via a property
         * placeholder by {@code DeadlineScheduler}'s {@code @Scheduled} poll, so it
         * is fixed at startup (not hot-reloadable like the other values here).
         */
        private Duration pollInterval = Duration.ofSeconds(1);
        /** Max deadlines dispatched per poll; the rest stay queued for the next tick. */
        private int batchSize = 16;
        /**
         * How far a deadline is pushed back when its dispatch loses the session lock
         * to a concurrent operation ({@code SESSION_LOCKED}) — the transition is
         * retried, not dropped.
         */
        private Duration retryDelay = Duration.ofSeconds(2);
        /**
         * How long after the host's last presence write they are considered
         * disconnected (F5). Each host heartbeat re-arms a {@code HOST_AWAY}
         * deadline this far out; when one actually fires, the open round
         * auto-pauses and the {@link #hostGrace} countdown starts.
         */
        private Duration hostOfflineAfter = Duration.ofSeconds(30);
        /**
         * How long a disconnected host has to return before the session is
         * cancelled (F5). Armed when {@code HOST_AWAY} fires; cleared by any host
         * presence write.
         */
        private Duration hostGrace = Duration.ofMinutes(2);
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
