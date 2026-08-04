package com.cephadex.ambi.session.event;

import java.time.Instant;
import java.util.UUID;

import com.cephadex.ambi.common.redis.RedisJsonCodec;

/**
 * A {@link SessionEventEnvelope} minted and pre-serialized for a Redis Lua
 * publish — the single place an envelope is created, so no call site can put an
 * un-enveloped event on the channel.
 *
 * <p>The JSON is split at the point the {@code sequence} goes ({@link #prefix} ..
 * {@code <sequence>} .. {@link #suffix}) because the sequence is allocated by the
 * script itself: only Redis can do the {@code INCR} and the {@code PUBLISH}
 * without another publisher interleaving between them. Splicing an integer into
 * pre-encoded fragments needs no escaping — every value here comes from
 * {@link RedisJsonCodec}, and Lua only contributes the number.
 *
 * @param eventId    the envelope's unique id
 * @param occurredAt when the event was minted
 * @param prefix     envelope JSON up to and including the {@code "sequence":} key
 * @param suffix     envelope JSON from just after the sequence number on
 */
public record SessionEventPayload(String eventId, Instant occurredAt, String prefix, String suffix) {

    /** Mints the envelope for {@code event} on session {@code publicId}. */
    public static SessionEventPayload of(RedisJsonCodec codec, String publicId, SessionEvent event) {
        String eventId = UUID.randomUUID().toString();
        Instant occurredAt = Instant.now();
        String prefix = "{\"publicId\":" + codec.serialize(publicId)
                + ",\"envelope\":{\"eventId\":" + codec.serialize(eventId)
                + ",\"sequence\":";
        String suffix = ",\"occurredAt\":" + codec.serialize(occurredAt)
                + ",\"event\":" + codec.serialize(event)
                + "}}";
        return new SessionEventPayload(eventId, occurredAt, prefix, suffix);
    }
}
