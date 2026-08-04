package com.cephadex.ambi.session.participant;

import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SessionEventPayload;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * Who is in a run. The durable record is the {@link Participant} collection —
 * each document points up at its session by {@code sessionId}, the same
 * child→parent shape {@code Answer} and {@code RoundResult} already use — and a
 * Redis SET ({@link SessionKeys#rosterKey}) fronts it as the live membership
 * index.
 *
 * <p><strong>Why a Redis SET.</strong> Admitting a player has to enforce the
 * participant cap and record the membership without two joins racing past the
 * limit or losing each other's write. As a set that is one atomic
 * {@code SCARD}+{@code SADD}, which {@link #admit} does in the same script that
 * allocates the event sequence and publishes — so the join path needs no session
 * lock, and concurrent joins never collide (they used to 409 with
 * {@code SESSION_LOCKED}).
 *
 * <p><strong>Distinct from presence.</strong> {@code PresenceStore} answers "who
 * is connected right now"; this answers "who is in this run". A disconnect never
 * removes a member — only an explicit {@link #remove} does.
 *
 * <p><strong>Self-healing.</strong> The set is a cache: eviction, a TTL lapse, or
 * a Redis restart leaves it missing, and every read here falls back to MongoDB
 * and writes what it found back. Nothing but a durable {@code leftAt} can take a
 * participant off the roster, so a rehydrate can't resurrect someone who left.
 */
@Component
public class SessionRoster {

    /**
     * Atomic admit-and-announce. {@code KEYS} is {@code [rosterKey,
     * eventSequenceKey]}; {@code ARGV} is {@code [participantId, cap, rosterTtlMillis,
     * sequenceTtlMillis, channel, payloadPrefix, payloadSuffix]}. Returns the
     * allocated sequence, or {@code -1} when the session is already at its cap
     * (nothing is added and nothing is published). Mirrors
     * {@code RedisEventPublisher.SCRIPT}: the sequence is spliced into
     * pre-serialized JSON fragments, so Lua only ever contributes an integer.
     */
    private static final RedisScript<Long> ADMIT = new DefaultRedisScript<>("""
            if redis.call('scard', KEYS[1]) >= tonumber(ARGV[2]) then return -1 end
            redis.call('sadd', KEYS[1], ARGV[1])
            redis.call('pexpire', KEYS[1], ARGV[3])
            local sequence = redis.call('incr', KEYS[2])
            redis.call('pexpire', KEYS[2], ARGV[4])
            redis.call('publish', ARGV[5], ARGV[6] .. sequence .. ARGV[7])
            return sequence""", Long.class);

    private final StringRedisTemplate redis;
    private final ParticipantRepository participants;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public SessionRoster(StringRedisTemplate redis, ParticipantRepository participants, RedisJsonCodec codec,
            SessionKeys keys, SessionRedisProperties props) {
        this.redis = redis;
        this.participants = participants;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * The session's roster in join order, straight from the durable documents —
     * the Redis set holds ids only, and order is load-bearing for the snapshot.
     */
    public List<Participant> participants(String sessionId) {
        return participants.findBySessionIdAndLeftAtIsNullOrderByJoinedAtAsc(sessionId);
    }

    /**
     * Adds a participant with no cap check and no event — the session's own host,
     * who is on the roster by construction and has nobody subscribed to tell.
     */
    public void add(String sessionId, String participantId) {
        String key = keys.rosterKey(sessionId);
        redis.opsForSet().add(key, participantId);
        redis.expire(key, props.getRoster().getTtl());
    }

    /**
     * Admits {@code participantId} to the session and publishes {@code event} in
     * one atomic step, rejecting the join if the roster is already at
     * {@code maxParticipants}. The participant's document must already be saved —
     * this only records the membership.
     *
     * @return {@code true} when admitted; {@code false} when the session is full
     *         (nothing added, nothing published)
     */
    public boolean admit(String sessionId, String publicId, String participantId, int maxParticipants,
            SessionEvent event) {
        rehydrateIfMissing(sessionId);
        SessionEventPayload payload = SessionEventPayload.of(codec, publicId, event);
        Long sequence = redis.execute(ADMIT,
                List.of(keys.rosterKey(sessionId), keys.eventSequenceKey(publicId)),
                participantId,
                String.valueOf(maxParticipants),
                String.valueOf(props.getRoster().getTtl().toMillis()),
                String.valueOf(props.getEventSequence().getTtl().toMillis()),
                props.getEvents().getChannel(),
                payload.prefix(),
                payload.suffix());
        return sequence != null && sequence > 0;
    }

    /** Drops a participant from the live membership (an explicit leave). */
    public void remove(String sessionId, String participantId) {
        redis.opsForSet().remove(keys.rosterKey(sessionId), participantId);
    }

    /**
     * Whether {@code participantId} is on the session's roster. A {@code SISMEMBER}
     * miss is re-checked against MongoDB and healed back into the set, so an
     * evicted key costs one slower read instead of locking a participant out of
     * their own session.
     */
    public boolean contains(String sessionId, String participantId) {
        if (Boolean.TRUE.equals(redis.opsForSet().isMember(keys.rosterKey(sessionId), participantId))) {
            return true;
        }
        if (!participants.existsByParticipantIdAndSessionIdAndLeftAtIsNull(participantId, sessionId)) {
            return false;
        }
        add(sessionId, participantId);
        return true;
    }

    /** Drops the session's membership set (the session reached a terminal state). */
    public void clear(String sessionId) {
        redis.delete(keys.rosterKey(sessionId));
    }

    /**
     * Seeds the set from the durable roster when the key is absent, so the cap
     * check that follows counts the real membership. Idempotent: {@code SADD} of
     * an existing member is a no-op, so a concurrent join can't be undone by a
     * rehydrate that overlaps it.
     */
    private void rehydrateIfMissing(String sessionId) {
        String key = keys.rosterKey(sessionId);
        if (Boolean.TRUE.equals(redis.hasKey(key))) {
            return;
        }
        List<Participant> durable = participants(sessionId);
        if (durable.isEmpty()) {
            return;
        }
        String[] ids = new String[durable.size()];
        for (int i = 0; i < ids.length; i++) {
            ids[i] = durable.get(i).getParticipantId();
        }
        redis.opsForSet().add(key, ids);
        redis.expire(key, props.getRoster().getTtl());
    }
}
