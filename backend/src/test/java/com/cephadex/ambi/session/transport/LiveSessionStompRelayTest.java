package com.cephadex.ambi.session.transport;

import static java.nio.charset.StandardCharsets.UTF_8;
import java.time.Instant;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import org.springframework.data.redis.connection.DefaultMessage;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.event.EventEnvelope;
import com.cephadex.ambi.session.event.SessionEventEnvelope;
import com.cephadex.ambi.session.event.TallyUpdated;

/**
 * Verifies the relay decodes a Redis envelope, routes it by publicId to the
 * per-session STOMP topic, and forwards the client-facing envelope intact —
 * without leaking the routing publicId into the client payload.
 */
class LiveSessionStompRelayTest {

    @Test
    void forwardsDecodedEnvelopeToSessionTopic() {
        SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
        RedisJsonCodec codec = new RedisJsonCodec();
        LiveSessionStompRelay relay = new LiveSessionStompRelay(messaging, codec);

        Instant occurredAt = Instant.parse("2026-07-01T10:00:00Z");
        EventEnvelope wire = new EventEnvelope("pub-1", new SessionEventEnvelope(
                "evt-1", 7L, occurredAt, new TallyUpdated("slide-1", Map.of("opt-a", 3))));
        byte[] body = codec.serialize(wire).getBytes(UTF_8);

        relay.onMessage(new DefaultMessage("ambi:session:events".getBytes(UTF_8), body), null);

        ArgumentCaptor<Object> payload = ArgumentCaptor.captor();
        verify(messaging).convertAndSend(eq("/topic/liveSession/pub-1"), payload.capture());

        // The client payload is exactly {eventId, sequence, occurredAt, event} —
        // SessionEventEnvelope has no publicId component, so routing can't leak.
        assertThat(payload.getValue()).isInstanceOfSatisfying(SessionEventEnvelope.class, envelope -> {
            assertThat(envelope.eventId()).isEqualTo("evt-1");
            assertThat(envelope.sequence()).isEqualTo(7L);
            assertThat(envelope.occurredAt()).isEqualTo(occurredAt);
            assertThat(envelope.event()).isInstanceOfSatisfying(TallyUpdated.class,
                    tally -> assertThat(tally.slideId()).isEqualTo("slide-1"));
        });
    }
}
