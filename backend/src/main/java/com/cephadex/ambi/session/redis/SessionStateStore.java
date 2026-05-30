package com.cephadex.ambi.session.redis;

import java.util.Optional;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.SessionTypes.SessionId;

/**
 * Reads and writes the {@link LiveRoundState} snapshot for a session in Redis,
 * via {@link RedisJsonCodec} for serialization and {@link SessionKeys} for the
 * key. The store itself does no locking — callers that read-modify-write must do
 * so inside {@link SessionLocks#withLock} so concurrent operations on the same
 * session serialize.
 */
@Component
public class SessionStateStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public SessionStateStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /** Returns the stored state for the session, or empty if none is present. */
    public Optional<LiveRoundState> load(SessionId sid) {
        String json = redis.opsForValue().get(keys.stateKey(sid));
        if (json == null) {
            return Optional.empty();
        }
        return Optional.of(codec.deserialize(json, LiveRoundState.class));
    }

    /** Writes the session's state, (re)setting the configured TTL backstop. */
    public void save(SessionId sid, LiveRoundState state) {
        redis.opsForValue().set(keys.stateKey(sid), codec.serialize(state), props.getState().getTtl());
    }

    /** Removes the session's state (e.g. when the session ends). */
    public void clear(SessionId sid) {
        redis.delete(keys.stateKey(sid));
    }
}
