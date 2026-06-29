package com.cephadex.ambi.session.event;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * The {@link EventPublisher} implementation. Publishes every event onto a single
 * Redis pub/sub channel wrapped in an {@link EventEnvelope} (so the {@code publicId}
 * the relay routes on travels with it). It does <strong>not</strong> touch STOMP
 * directly: a {@code LiveSessionStompRelay} on every app instance — including this
 * one — subscribes to the channel and re-broadcasts to its locally-connected
 * subscribers. That single delivery path is what makes the system multi-instance
 * correct without any self-skip/dedup logic; the cost is one local Redis round-trip
 * before delivery, negligible here.
 */
@Component
public class EventBroadcaster implements EventPublisher {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionRedisProperties props;

    public EventBroadcaster(StringRedisTemplate redis, RedisJsonCodec codec, SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.props = props;
    }

    @Override
    public void publish(String publicId, SessionEvent event) {
        String payload = codec.serialize(new EventEnvelope(publicId, event));
        redis.convertAndSend(props.getEvents().getChannel(), payload);
    }
}
