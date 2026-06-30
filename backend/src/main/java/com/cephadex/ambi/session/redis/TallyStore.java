package com.cephadex.ambi.session.redis;

import java.util.HashMap;
import java.util.Map;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Running per-option submission counts for a live round, kept in Redis as a
 * Hash
 * keyed by option id. Deliberately <strong>not</strong> part of the
 * {@link LiveRoundState} snapshot: the snapshot is the host-driven control
 * record
 * that read-modify-writes under {@link SessionLocks the session lock}, whereas
 * a
 * tally is bumped once per participant submission. Embedding it in the snapshot
 * would force every submission to take the session lock and rewrite the whole
 * blob; a Redis Hash lets each {@link #increment} be a single atomic
 * {@code HINCRBY} with no lock and no read-modify-write.
 *
 * <p>
 * Counts are stored as the field values of {@link SessionKeys#tallyKey the
 * round's tally hash}; the hash self-expires on the configured TTL as an
 * abandoned-session backstop, refreshed on every increment.
 */
@Component
public class TallyStore {

    private final StringRedisTemplate redis;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public TallyStore(StringRedisTemplate redis, SessionKeys keys, SessionRedisProperties props) {
        this.redis = redis;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Atomically adds one to {@code optionId}'s count for the round and refreshes
     * the tally's TTL. Lock-free — {@code HINCRBY} serializes on the Redis server,
     * so concurrent submissions for different (or the same) options can't lose a
     * count.
     *
     * @return the option's new running count
     */
    public long increment(String sessionId, String slideId, String optionId) {
        String key = keys.tallyKey(sessionId, slideId);
        Long count = redis.<String, String>opsForHash().increment(key, optionId, 1L);
        redis.expire(key, props.getTally().getTtl());
        return count == null ? 0L : count;
    }

    /**
     * Atomically subtracts one from {@code optionId}'s count for the round and
     * refreshes the tally's TTL — the inverse of {@link #increment}, used to back
     * out a participant's prior selection when they change a multi-select answer.
     * Only ever cancels a matching prior increment, so the count stays ≥ 0.
     *
     * @return the option's new running count
     */
    public long decrement(String sessionId, String slideId, String optionId) {
        String key = keys.tallyKey(sessionId, slideId);
        Long count = redis.<String, String>opsForHash().increment(key, optionId, -1L);
        redis.expire(key, props.getTally().getTtl());
        return count == null ? 0L : count;
    }

    /**
     * The round's current per-option counts, keyed by option id (empty if none
     * yet).
     */
    public Map<String, Integer> tally(String sessionId, String slideId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        Map<String, String> raw = ops.entries(keys.tallyKey(sessionId, slideId));
        Map<String, Integer> counts = new HashMap<>(raw.size());
        raw.forEach((optionId, value) -> counts.put(optionId, Integer.parseInt(value)));
        return counts;
    }

    /**
     * Removes the round's tally (e.g. when (re)opening the round, or when it ends).
     */
    public void clear(String sessionId, String slideId) {
        redis.delete(keys.tallyKey(sessionId, slideId));
    }
}
