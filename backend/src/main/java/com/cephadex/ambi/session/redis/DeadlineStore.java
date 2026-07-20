package com.cephadex.ambi.session.redis;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

/**
 * The global deadline ZSET (ADR 002): pending scheduler-fired transitions,
 * scored by their due time in epoch millis. Writers (the orchestrator's round
 * transitions and presence hooks) {@link #schedule}/{@link #cancel} entries;
 * the single {@code DeadlineScheduler} leader drains due ones via
 * {@link #popDue}.
 *
 * <p>Like the other session stores this holds no domain logic — it persists,
 * removes, and pops {@link SessionDeadline} members. {@code ZADD} upserts, so
 * re-scheduling an existing member (a pause/resume cycle, a host heartbeat
 * re-arming its liveness deadline) just moves its score. No TTL: entries are
 * removed by the transitions that consume or supersede them, and the set only
 * ever holds a handful of members per live session.
 */
@Component
public class DeadlineStore {

    private static final Logger log = LoggerFactory.getLogger(DeadlineStore.class);

    /**
     * Atomic pop-of-the-due: read up to {@code ARGV[2]} members scored at or
     * before {@code ARGV[1]} and remove them in the same script, so a popped
     * deadline can never be dispatched twice even if two pollers raced (the
     * single-leader election already makes that unlikely; this makes it safe).
     */
    @SuppressWarnings("rawtypes")
    private static final RedisScript<List> POP_DUE = new DefaultRedisScript<>(
            """
            local due = redis.call('ZRANGEBYSCORE', KEYS[1], '-inf', ARGV[1], 'LIMIT', 0, tonumber(ARGV[2]))
            for i = 1, #due do
                redis.call('ZREM', KEYS[1], due[i])
            end
            return due
            """, List.class);

    private final StringRedisTemplate redis;
    private final SessionKeys keys;

    public DeadlineStore(StringRedisTemplate redis, SessionKeys keys) {
        this.redis = redis;
        this.keys = keys;
    }

    /** Schedules (or re-schedules — upsert) the deadline to fire at {@code dueAt}. */
    public void schedule(SessionDeadline deadline, Instant dueAt) {
        redis.opsForZSet().add(keys.deadlinesKey(), deadline.member(), dueAt.toEpochMilli());
    }

    /** Removes the deadline if pending; a no-op if it never was or already fired. */
    public void cancel(SessionDeadline deadline) {
        redis.opsForZSet().remove(keys.deadlinesKey(), deadline.member());
    }

    /**
     * Atomically removes and returns up to {@code limit} deadlines due at or
     * before {@code now}, oldest first. A member that doesn't parse (a stray or
     * legacy entry) is logged and dropped — it has already been removed from the
     * set, so it can't wedge the poll forever.
     */
    public List<SessionDeadline> popDue(Instant now, int limit) {
        List<?> members = redis.execute(POP_DUE, List.of(keys.deadlinesKey()),
                String.valueOf(now.toEpochMilli()), String.valueOf(limit));
        if (members == null || members.isEmpty()) {
            return List.of();
        }
        List<SessionDeadline> due = new ArrayList<>(members.size());
        for (Object member : members) {
            SessionDeadline parsed = SessionDeadline.parse(String.valueOf(member));
            if (parsed == null) {
                log.warn("Dropping unparseable deadline member '{}' from {}", member, keys.deadlinesKey());
                continue;
            }
            due.add(parsed);
        }
        return due;
    }
}
