package com.cephadex.ambi.session.transport;

import static java.nio.charset.StandardCharsets.UTF_8;
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
import com.cephadex.ambi.session.event.TallyUpdated;

/**
 * Verifies the relay decodes a Redis envelope and forwards the event to the
 * per-session STOMP topic addressed by its publicId.
 */
class LiveSessionStompRelayTest {

    @Test
    void forwardsDecodedEventToSessionTopic() {
        SimpMessagingTemplate messaging = mock(SimpMessagingTemplate.class);
        RedisJsonCodec codec = new RedisJsonCodec();
        LiveSessionStompRelay relay = new LiveSessionStompRelay(messaging, codec);

        EventEnvelope envelope = new EventEnvelope("pub-1", new TallyUpdated("slide-1", Map.of("opt-a", 3)));
        byte[] body = codec.serialize(envelope).getBytes(UTF_8);

        relay.onMessage(new DefaultMessage("ambi:session:events".getBytes(UTF_8), body), null);

        ArgumentCaptor<Object> event = ArgumentCaptor.forClass(Object.class);
        verify(messaging).convertAndSend(eq("/topic/liveSession/pub-1"), event.capture());

        assertThat(event.getValue()).isInstanceOf(TallyUpdated.class);
        assertThat(((TallyUpdated) event.getValue()).slideId()).isEqualTo("slide-1");
    }
}
