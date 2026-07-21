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
 * layer's: it tolerates unknown properties for forward compatibility (see below),
 * which the strict web mapper should not. The reverse direction — an older
 * stored blob read by a newer schema that added primitive fields — is
 * deliberately <em>not</em> tolerated by default: zero-filling an absent
 * primitive is only safe when zero genuinely means "absent" (a never-paused
 * round), and would silently mask corruption for types like a numeric answer
 * where {@code 0.0} is a real value. Types that evolve in place opt in per
 * call via {@link #deserializeLenient}. Jackson 3 auto-registers {@code java.time}
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

    /**
     * Like {@link #deserialize(String, Class)}, but additionally zero-fills
     * primitive fields absent from the stored JSON. For types that evolve in
     * place and whose blobs outlive a deploy — e.g. a {@code LiveRoundState}
     * written before the ADR 002 timer fields existed can sit in Redis for up
     * to 6h — where a zero/false default genuinely means "absent". Only use
     * this when that holds for <em>every</em> primitive on the type; otherwise
     * a missing field would masquerade as a real zero (see the class doc).
     */
    public <T> T deserializeLenient(String json, Class<T> type) {
        try {
            return mapper.readerFor(type)
                    .without(DeserializationFeature.FAIL_ON_NULL_FOR_PRIMITIVES)
                    .readValue(json);
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
