package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;

import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * Covers the single choke point where a {@link SessionEventEnvelope} is minted:
 * publishing allocates the session's sequence and broadcasts in one atomic Lua
 * step (counter key, TTL refresh, channel), and the payload that script assembles
 * from the pre-serialized fragments is exactly the {@link EventEnvelope} JSON the
 * relay reads back — the guard against the hand-split fragments drifting from the
 * record.
 */
class RedisEventPublisherTest {

    private static final String PUBLIC_ID = "pub-1";

    private StringRedisTemplate redis;
    private RedisJsonCodec codec;
    private RedisEventPublisher publisher;

    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        codec = new RedisJsonCodec();
        SessionRedisProperties props = new SessionRedisProperties();
        publisher = new RedisEventPublisher(redis, codec, new SessionKeys(props), props);
    }

    @Test
    void publishAllocatesTheSessionSequenceAndBroadcastsInOneStep() {
        publisher.publish(PUBLIC_ID, new TallyUpdated("slide-1", Map.of("opt-a", 2)));

        ArgumentCaptor<RedisScript<Long>> script = ArgumentCaptor.captor();
        ArgumentCaptor<List<String>> keys = ArgumentCaptor.captor();
        ArgumentCaptor<Object> argv = ArgumentCaptor.captor();
        verify(redis).execute(script.capture(), keys.capture(),
                argv.capture(), argv.capture(), argv.capture(), argv.capture());

        assertThat(keys.getValue()).containsExactly("ambi:session:eventseq:" + PUBLIC_ID);
        // INCR + TTL refresh + PUBLISH in one server-side step, so no publish site
        // can interleave between taking a sequence and putting its event on the wire.
        assertThat(script.getValue().getScriptAsString())
                .contains("redis.call('incr', KEYS[1])")
                .contains("redis.call('pexpire', KEYS[1], ARGV[1])")
                .contains("redis.call('publish', ARGV[2], ARGV[3] .. sequence .. ARGV[4])");
        // Refresh-on-write TTL (the configured 6h default), in millis for PEXPIRE.
        assertThat(argv.getAllValues().get(0)).isEqualTo(String.valueOf(Duration.ofHours(6).toMillis()));
        assertThat(argv.getAllValues().get(1)).isEqualTo("ambi:session:events");
    }

    @Test
    void assembledPayloadIsTheWireEnvelopeWithTheSplicedSequence() {
        Instant before = Instant.parse("2026-07-01T10:00:00Z");
        publisher.publish(PUBLIC_ID, new TallyUpdated("slide-1", Map.of("opt-a", 2)));

        // Exactly what the script builds: prefix .. <sequence> .. suffix.
        String payload = spliced(argvOfSingleCall(), 42L);

        EventEnvelope wire = codec.deserialize(payload, EventEnvelope.class);
        assertThat(wire.publicId()).isEqualTo(PUBLIC_ID);
        assertThat(wire.envelope().sequence()).isEqualTo(42L);
        assertThat(wire.envelope().eventId()).isNotBlank();
        assertThat(wire.envelope().occurredAt()).isAfterOrEqualTo(before);
        assertThat(wire.envelope().event()).isInstanceOfSatisfying(TallyUpdated.class,
                tally -> assertThat(tally.slideId()).isEqualTo("slide-1"));
        // The event round-trips on its "type" discriminator; the static
        // classification is a compile-time seam only and must never reach the wire.
        assertThat(payload).contains("\"type\":\"TallyUpdated\"").doesNotContain("\"kind\"");
    }

    @Test
    void everyEmissionGetsItsOwnEventId() {
        publisher.publish(PUBLIC_ID, new TallyUpdated("slide-1", Map.of("opt-a", 1)));
        publisher.publish(PUBLIC_ID, new TallyUpdated("slide-1", Map.of("opt-a", 2)));

        ArgumentCaptor<Object> argv = ArgumentCaptor.captor();
        verify(redis, times(2)).execute(any(), anyList(),
                argv.capture(), argv.capture(), argv.capture(), argv.capture());

        List<Object> all = argv.getAllValues();
        String first = eventIdOf(spliced(all.subList(0, 4), 1L));
        String second = eventIdOf(spliced(all.subList(4, 8), 2L));
        assertThat(first).isNotEqualTo(second);
    }

    // ── helpers ──

    /** The four ARGV values of the single recorded {@code execute} call. */
    private List<Object> argvOfSingleCall() {
        ArgumentCaptor<Object> argv = ArgumentCaptor.captor();
        verify(redis).execute(any(), anyList(),
                argv.capture(), argv.capture(), argv.capture(), argv.capture());
        return argv.getAllValues();
    }

    /** Reproduces the script's {@code ARGV[3] .. sequence .. ARGV[4]} splice. */
    private static String spliced(List<Object> argv, long sequence) {
        return String.valueOf(argv.get(2)) + sequence + argv.get(3);
    }

    private String eventIdOf(String payload) {
        return codec.deserialize(payload, EventEnvelope.class).envelope().eventId();
    }
}
