package com.cephadex.ambi.common.redis;

import org.springframework.stereotype.Component;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * Shared JSON codec for everything we keep in Redis as a string value
 * (live-session state, tallies, …). Centralises one correctly-configured Jackson
 * mapper so call sites don't each hand-roll one.
 *
 * <p>Deliberately owns a <strong>Jackson 2</strong> ({@code com.fasterxml.jackson})
 * mapper rather than injecting Spring's bean. Spring Boot 4 ships both Jackson 2
 * and Jackson 3 ({@code tools.jackson}) and the auto-configured {@code ObjectMapper}
 * is the Jackson 3 one, which would not satisfy a Jackson 2 injection point. The
 * domain types we serialize — notably the sealed
 * {@link com.cephadex.ambi.session.answer.payload.AnswerPayload} hierarchy — are
 * annotated with Jackson 2 {@code @JsonTypeInfo}/{@code @JsonSubTypes}, so the
 * mapper must be Jackson 2 for the polymorphic discriminator to resolve. This is
 * the same reasoning documented on
 * {@code RedisTokenSessionService}'s private mapper; that service keeps its own
 * (its {@code UserSession} is primitives-only and needs no modules), whereas this
 * codec adds {@link JavaTimeModule} so {@link java.time.Instant} and friends
 * round-trip as ISO-8601 text rather than numeric timestamps.
 */
@Component
public class RedisJsonCodec {

    private final ObjectMapper mapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
            // Tolerate forward-compatible records: a newer writer may add fields
            // an older reader doesn't know yet.
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);

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
