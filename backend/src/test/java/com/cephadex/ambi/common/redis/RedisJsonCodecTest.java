package com.cephadex.ambi.common.redis;

import java.time.Instant;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.redis.LiveRoundState;

/**
 * Verifies the two things this codec adds over a bare Jackson mapper: {@code Instant}
 * fields serialize as ISO-8601 text (not epoch numbers) and round-trip, and the
 * polymorphic {@link AnswerPayload} hierarchy carries its {@code answerType}
 * discriminator so it deserializes back to the right concrete subtype.
 */
class RedisJsonCodecTest {

    private final RedisJsonCodec codec = new RedisJsonCodec();

    @Test
    void instantRoundTripsAsIso8601() {
        Instant startedAt = Instant.parse("2026-05-30T12:00:00Z");
        LiveRoundState state = new LiveRoundState("public-1", RoundPhase.SUBMIT, "slide-1", startedAt, null, null, 0L, false);

        String json = codec.serialize(state);

        // ISO text, not a numeric timestamp.
        assertThat(json).contains("2026-05-30T12:00:00Z");
        assertThat(codec.deserialize(json, LiveRoundState.class)).isEqualTo(state);
    }

    @Test
    void legacyBlobWithoutTimerFieldsStillDeserializes() {
        // A LiveRoundState stored before the ADR 002 timer fields existed (or
        // before autoPaused) can sit in Redis for up to 6h across a deploy; the
        // newer reader must zero-fill the absent primitives, not fail the read.
        String legacy = "{\"publicId\":\"public-1\",\"phase\":\"SUBMIT\","
                + "\"currentSlideId\":\"slide-1\",\"roundStartedAt\":\"2026-05-30T12:00:00Z\"}";

        LiveRoundState state = codec.deserialize(legacy, LiveRoundState.class);

        assertThat(state.durationMs()).isNull();
        assertThat(state.pausedAt()).isNull();
        assertThat(state.accumulatedPauseMs()).isZero();
        assertThat(state.autoPaused()).isFalse();
    }

    @Test
    void polymorphicAnswerPayloadKeepsItsDiscriminator() {
        AnswerPayload payload = new McqAnswer(Set.of("opt-a", "opt-b"));

        String json = codec.serialize(payload);

        assertThat(json).contains("answerType");
        AnswerPayload back = codec.deserialize(json, AnswerPayload.class);
        assertThat(back).isInstanceOf(McqAnswer.class);
        assertThat(((McqAnswer) back).optionIds()).containsExactlyInAnyOrder("opt-a", "opt-b");
    }

    @Test
    void unreadableJsonThrowsCodecException() {
        org.assertj.core.api.Assertions
                .assertThatThrownBy(() -> codec.deserialize("{ not json", LiveRoundState.class))
                .isInstanceOf(RedisCodecException.class);
    }
}
