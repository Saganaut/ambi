package com.cephadex.ambi.session.transport;

import java.nio.charset.StandardCharsets;

import org.springframework.data.redis.connection.Message;
import org.springframework.data.redis.connection.MessageListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.event.EventEnvelope;
import com.cephadex.ambi.session.event.SessionEventEnvelope;

/**
 * Bridges the Redis fan-out channel to this instance's local STOMP broker. Every
 * app instance runs one, subscribed (via {@code SessionPubSubConfig}) to the
 * shared events channel: on each message it decodes the {@link EventEnvelope} and
 * forwards its {@link SessionEventEnvelope} to {@code /topic/liveSession/<publicId>},
 * reaching exactly the subscribers connected here. The instance that produced the
 * event receives it the same way, so there is a single, uniform delivery path.
 *
 * <p>The client payload is the envelope as minted by {@code RedisEventPublisher}
 * ({@code eventId}, {@code sequence}, {@code occurredAt}, {@code event}) —
 * unwrapping the outer {@link EventEnvelope} is what keeps the routing
 * {@code publicId} off the wire, and nothing else about the payload is rewritten
 * here.
 */
@Component
public class LiveSessionStompRelay implements MessageListener {

    private static final String TOPIC_PREFIX = "/topic/liveSession/";

    private final SimpMessagingTemplate messaging;
    private final RedisJsonCodec codec;

    public LiveSessionStompRelay(SimpMessagingTemplate messaging, RedisJsonCodec codec) {
        this.messaging = messaging;
        this.codec = codec;
    }

    @Override
    public void onMessage(Message message, byte[] pattern) {
        String json = new String(message.getBody(), StandardCharsets.UTF_8);
        EventEnvelope wire = codec.deserialize(json, EventEnvelope.class);
        messaging.convertAndSend(TOPIC_PREFIX + wire.publicId(), wire.envelope());
    }
}
