package com.cephadex.ambi.session.redis;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * Read side of a session's monotonic event counter — the sequence stamped on
 * every broadcast {@code SessionEventEnvelope}.
 *
 * <p><strong>Read-only by design.</strong> The counter is never bumped here:
 * allocation happens exclusively inside {@code RedisEventPublisher}'s Lua
 * allocate-and-publish script, so a sequence can't be handed out without its
 * event reaching the channel. This store exists so the snapshot assembly can
 * report the sequence its view reflects without reaching for
 * {@link StringRedisTemplate} itself; both sides address the key through
 * {@link SessionKeys#eventSequenceKey}, which is what keeps them on the same key.
 */
@Component
public class EventSequenceStore {

    private final StringRedisTemplate redis;
    private final SessionKeys keys;

    public EventSequenceStore(StringRedisTemplate redis, SessionKeys keys) {
        this.redis = redis;
        this.keys = keys;
    }

    /**
     * The last sequence allocated for the session, or {@code 0} when the counter
     * key is absent — which means either no event has been published yet or the
     * counter's TTL has lapsed on an abandoned session. Both cases are reported
     * the same way on purpose: {@code 0} is "nothing to reconcile against", and a
     * client that seeds from it simply accepts whatever arrives next.
     *
     * <p>A plain {@code GET}: no lock, consistent with the best-effort reads the
     * snapshot is assembled from.
     *
     * @param publicId the session's public handle — the id events are published
     *                 and routed under
     */
    public long lastSequence(String publicId) {
        String raw = redis.opsForValue().get(keys.eventSequenceKey(publicId));
        return raw == null ? 0L : Long.parseLong(raw);
    }
}
