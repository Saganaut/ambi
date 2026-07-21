package com.cephadex.ambi.session.redis;

import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;

/**
 * Reads and writes the {@link LiveRoundState} snapshot for a session in Redis,
 * via {@link RedisJsonCodec} for serialization and {@link SessionKeys} for the
 * key. The store itself does no locking — callers that read-modify-write must do
 * so inside {@link SessionLocks#withLock} so concurrent operations on the same
 * session serialize.
 */
@Component
public class LiveRoundStateStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public LiveRoundStateStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /** Returns the stored state for the session, or empty if none is present. */
    public Optional<LiveRoundState> load(String sessionId) {
        String json = redis.opsForValue().get(keys.roundStateKey(sessionId));
        if (json == null) {
            return Optional.empty();
        }
        // Lenient: a blob written before a later-added primitive field (the ADR
        // 002 accumulatedPauseMs/autoPaused) may outlive a deploy; zero/false is
        // the correct "absent" default for every primitive on this record.
        return Optional.of(codec.deserializeLenient(json, LiveRoundState.class));
    }

    /** Writes the session's state, (re)setting the configured TTL backstop. */
    public void save(String sessionId, LiveRoundState state) {
        redis.opsForValue().set(keys.roundStateKey(sessionId), codec.serialize(state), props.getRoundState().getTtl());
    }

    /** Removes the session's state (e.g. when the session ends). */
    public void clear(String sessionId) {
        redis.delete(keys.roundStateKey(sessionId));
    }
}
