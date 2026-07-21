package com.cephadex.ambi.common.redis;

import org.springframework.stereotype.Component;

import tools.jackson.core.type.TypeReference;
import tools.jackson.databind.DeserializationFeature;
import tools.jackson.databind.cfg.DateTimeFeature;
import tools.jackson.databind.json.JsonMapper;

/**
 * Shared JSON codec for everything we keep in Redis as a string value
 * (live-session state, tallies, …). Centralises one correctly-configured Jackson
 * mapper so call sites don't each hand-roll one.
 *
 * <p>Owns its own <strong>Jackson 3</strong> ({@code tools.jackson}) mapper rather
 * than injecting Spring's web bean, so its config is independent of the HTTP
 * layer's: it tolerates unknown properties (a newer writer, older reader) and
 * absent primitive fields (an older blob, newer reader) for schema evolution in
 * both directions — see below — which the strict web mapper should not. Jackson 3 auto-registers {@code java.time}
 * support, so {@link java.time.Instant} and friends round-trip as ISO-8601 text
 * with no module to register; we still set {@code WRITE_DATES_AS_TIMESTAMPS=false}
 * explicitly to pin that behaviour. The sealed
 * {@link com.cephadex.ambi.session.answer.payload.AnswerPayload} hierarchy carries
 * {@code @JsonTypeInfo}/{@code @JsonSubTypes} from the shared
 * {@code com.fasterxml.jackson.annotation} package, which Jackson 3 resolves
 * natively.
 */
@Component
public class RedisJsonCodec {

    private final JsonMapper mapper = JsonMapper.builder()
            // Pin ISO-8601 text for Instant & friends (also the Jackson 3 default).
            .disable(DateTimeFeature.WRITE_DATES_AS_TIMESTAMPS)
            // Tolerate forward-compatible records: a newer writer may add fields
            // an older reader doesn't know yet.
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            // …and backward-compatible ones: a newer reader must accept older
            // stored JSON that predates a primitive field (e.g. LiveRoundState's
            // accumulatedPauseMs/autoPaused, live for up to 6h across a deploy),
            // zero-filling it instead of failing the read.
            .disable(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
            .build();

    /** Serializes {@code value} to a JSON string, or throws {@link RedisCodecException}. */
    public String serialize(Object value) {
        try {
            return mapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new RedisCodecException("Failed to serialize " + className(value) + " for Redis", e);
        }
    }

    /** Reads {@code json} back into {@code type}, or throws {@link RedisCodecException}. */
    public <T> T deserialize(String json, Class<T> type) {
        try {
            return mapper.readValue(json, type);
        } catch (Exception e) {
            throw new RedisCodecException("Failed to deserialize Redis value into " + type.getSimpleName(), e);
        }
    }

    /** Generic-aware read for container types (maps, lists, …). */
    public <T> T deserialize(String json, TypeReference<T> type) {
        try {
            return mapper.readValue(json, type);
        } catch (Exception e) {
            throw new RedisCodecException("Failed to deserialize Redis value into " + type.getType(), e);
        }
    }

    private static String className(Object value) {
        return value == null ? "null" : value.getClass().getSimpleName();
    }
}
