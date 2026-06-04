package com.cephadex.ambi.session.redis;

import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;

/**
 * Live participant presence for a session, kept in Redis as a Hash with one
 * field per participant. Presence ({@link Presence}) is the volatile,
 * heartbeat-driven part of a participant that would otherwise hammer the
 * {@code Participant} document; keeping it here lets a heartbeat be a single
 * {@code HSET} and the whole roster's presence read back in one {@code HGETALL}
 * (for a lobby or scoreboard) without a per-participant key scan.
 *
 * <p>
 * Keyed per session via {@link SessionKeys#presenceKey} (presence spans the
 * whole session, not one round). Like the other session stores it does no
 * locking and no status logic — the caller computes the {@link Presence} value;
 * the store just persists, reads, and removes it, refreshing the session TTL on
 * every write.
 */
@Component
public class PresenceStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public PresenceStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Writes {@code presence} for the participant and refreshes the session's TTL.
     */
    public void save(String sessionId, String participantId, Presence presence) {
        String key = keys.presenceKey(sessionId);
        redis.<String, String>opsForHash().put(key, participantId, codec.serialize(presence));
        redis.expire(key, props.getPresence().getTtl());
    }

    /**
     * This participant's presence, or empty if none is recorded for the session.
     */
    public Optional<Presence> find(String sessionId, String participantId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        String json = ops.get(keys.presenceKey(sessionId), participantId);
        return json == null ? Optional.empty() : Optional.of(codec.deserialize(json, Presence.class));
    }

    /** Every participant's presence for the session, keyed by participant id. */
    public Map<String, Presence> all(String sessionId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        Map<String, String> raw = ops.entries(keys.presenceKey(sessionId));
        Map<String, Presence> presence = new HashMap<>(raw.size());
        raw.forEach((participantId, json) -> presence.put(new String(participantId),
                codec.deserialize(json, Presence.class)));
        return presence;
    }

    /** Drops a participant's presence (e.g. when they leave the session). */
    public void remove(String sessionId, String participantId) {
        redis.<String, String>opsForHash().delete(keys.presenceKey(sessionId), participantId);
    }

    /** Removes all presence for the session (e.g. when the session ends). */
    public void clear(String sessionId) {
        redis.delete(keys.presenceKey(sessionId));
    }
}