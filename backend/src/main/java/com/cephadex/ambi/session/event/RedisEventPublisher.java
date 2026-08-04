package com.cephadex.ambi.session.event;

import java.util.List;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * The {@link EventPublisher} implementation. Every event gets an {@code eventId},
 * a per-session {@code sequence}, and an {@code occurredAt}: the first and last
 * from {@link SessionEventPayload} (the single choke point where a
 * {@link SessionEventEnvelope} is minted, shared with the roster's
 * admit-and-announce script), the sequence from the script below.
 *
 * <p>Publishing goes onto a single Redis pub/sub channel wrapped in an
 * {@link EventEnvelope} (so the {@code publicId} the relay routes on travels with
 * it). It does <strong>not</strong> touch STOMP directly: a
 * {@code LiveSessionStompRelay} on every app instance — including this one —
 * subscribes to the channel and re-broadcasts to its locally-connected
 * subscribers. That single delivery path is what makes the system multi-instance
 * correct without any self-skip/dedup logic; the cost is one local Redis
 * round-trip before delivery, negligible here.
 *
 * <p><strong>Why allocate-and-publish is one Lua script.</strong> Clients treat a
 * sequence gap as "I missed something" and refetch, so two events that are
 * allocated in one order and published in the other cause a spurious gap. Most
 * orchestrator publish sites run under {@code SessionLocks.withLock}, which would
 * order them — but six do not (leave, reconnect, answer submission, vote
 * submission, and the Q&amp;A-update path shared by question submission and host
 * answers), by design: those are the lock-free hot paths. A seventh, join,
 * publishes from {@code SessionRoster}'s admit-and-announce script for the same
 * reason. So ordering can't be borrowed from the lock. Instead {@link #SCRIPT}
 * does the {@code INCR}, the TTL refresh, and the {@code PUBLISH} in one
 * server-side step, which Redis runs to completion
 * without interleaving. The sequence number is spliced into pre-serialized JSON
 * fragments rather than re-encoded in Lua: the fragments come from
 * {@link RedisJsonCodec}, and the only value Lua contributes is an integer, so
 * there is nothing to escape.
 */
@Component
public class RedisEventPublisher implements EventPublisher {

    private static final Logger log = LoggerFactory.getLogger(RedisEventPublisher.class);

    /**
     * Atomic allocate-and-publish. {@code KEYS[1]} is the session's event counter;
     * {@code ARGV} is {@code [ttlMillis, channel, payloadPrefix, payloadSuffix]}.
     * The payload is the envelope JSON split at the point the sequence goes, so the
     * number Lua just allocated lands inside it. Returns the allocated sequence.
     */
    private static final RedisScript<Long> SCRIPT = new DefaultRedisScript<>("""
            local sequence = redis.call('incr', KEYS[1])
            redis.call('pexpire', KEYS[1], ARGV[1])
            redis.call('publish', ARGV[2], ARGV[3] .. sequence .. ARGV[4])
            return sequence""", Long.class);

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public RedisEventPublisher(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    @Override
    public void publish(String publicId, SessionEvent event) {
        SessionEventPayload payload = SessionEventPayload.of(codec, publicId, event);

        Long sequence = redis.execute(SCRIPT, List.of(keys.eventSequenceKey(publicId)),
                String.valueOf(props.getEventSequence().getTtl().toMillis()),
                props.getEvents().getChannel(),
                payload.prefix(),
                payload.suffix());

        log.trace("Published {} #{} on session {}", event.getClass().getSimpleName(), sequence, publicId);
    }
}
