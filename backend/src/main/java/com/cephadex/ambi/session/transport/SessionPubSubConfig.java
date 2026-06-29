package com.cephadex.ambi.session.transport;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.listener.ChannelTopic;
import org.springframework.data.redis.listener.RedisMessageListenerContainer;

import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * Wires the Redis pub/sub side of event fan-out. Spring Boot does not create a
 * {@link RedisMessageListenerContainer} on its own, so we declare one and
 * subscribe the {@link LiveSessionStompRelay} to the shared session-events channel.
 * Reuses the auto-configured {@link RedisConnectionFactory}.
 */
@Configuration
public class SessionPubSubConfig {

    @Bean
    RedisMessageListenerContainer sessionEventListenerContainer(RedisConnectionFactory connectionFactory,
            LiveSessionStompRelay relay, SessionRedisProperties props) {
        RedisMessageListenerContainer container = new RedisMessageListenerContainer();
        container.setConnectionFactory(connectionFactory);
        container.addMessageListener(relay, new ChannelTopic(props.getEvents().getChannel()));
        return container;
    }
}
