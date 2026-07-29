package com.cephadex.ambi.session.event;

/**
 * What rides the Redis fan-out channel: the {@code publicId} the relay routes on
 * plus the client-facing {@link SessionEventEnvelope} to deliver.
 * {@code RedisEventPublisher} assembles this; the {@code LiveSessionStompRelay}
 * on each instance deserializes it and forwards {@link #envelope()} — routing id
 * stripped — to {@code /topic/liveSession/<publicId>}. The nested event is
 * polymorphic, so it round-trips with its {@code "type"} discriminator.
 *
 * <p><strong>Wire-format note.</strong> This record's JSON shape is not only
 * produced by Jackson: {@code RedisEventPublisher} splices the sequence number
 * into pre-serialized fragments of it inside a Lua script, so the field names
 * here are load-bearing. {@code RedisEventPublisherTest} deserializes an
 * assembled payload back into this record to guard the two against drift.
 */
public record EventEnvelope(String publicId, SessionEventEnvelope envelope) {
}
