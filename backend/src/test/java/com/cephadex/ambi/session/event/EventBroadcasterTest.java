package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import java.util.Map;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * Verifies the broadcaster serializes an {@link EventEnvelope} (publicId + typed
 * event) and publishes it to the configured Redis events channel.
 */
class EventBroadcasterTest {

    @Test
    void publishSerializesEnvelopeToConfiguredChannel() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        SessionRedisProperties props = new SessionRedisProperties();
        EventBroadcaster broadcaster = new EventBroadcaster(redis, new RedisJsonCodec(), props);

        broadcaster.publish("pub-1", new TallyUpdated("slide-1", Map.of("opt-a", 2)));

        ArgumentCaptor<Object> payload = ArgumentCaptor.forClass(Object.class);
        verify(redis).convertAndSend(org.mockito.ArgumentMatchers.eq("ambi:session:events"), payload.capture());

        String json = (String) payload.getValue();
        assertThat(json)
                .contains("pub-1")
                .contains("TallyUpdated")
                .contains("slide-1")
                .contains("opt-a");
    }
}
