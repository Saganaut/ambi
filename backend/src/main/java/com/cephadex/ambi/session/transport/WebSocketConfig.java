package com.cephadex.ambi.session.transport;

import java.util.List;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.converter.DefaultContentTypeResolver;
import org.springframework.messaging.converter.MappingJackson2MessageConverter;
import org.springframework.messaging.converter.MessageConverter;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.util.MimeTypeUtils;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import com.cephadex.ambi.auth.config.AuthProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;

/**
 * STOMP-over-WebSocket transport for live sessions. Clients connect to {@code /ws}
 * and subscribe to {@code /topic/liveSession/<publicId>} to receive
 * {@link com.cephadex.ambi.session.event.SessionEvent}s. There is no inbound
 * application destination: commands go over REST (open-decisions A1), so only
 * CONNECT/SUBSCRIBE traverse the inbound channel, where
 * {@link SubscribeAuthInterceptor} authorizes subscriptions.
 *
 * <p>Cross-instance fan-out is handled by Redis pub/sub
 * ({@link SessionPubSubConfig} + {@link LiveSessionStompRelay}); this side runs
 * only the in-memory {@code SimpleBroker} that delivers to locally-connected
 * clients.
 */
@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final AuthProperties authProperties;
    private final WsHandshakeHandler handshakeHandler;
    private final SubscribeAuthInterceptor subscribeAuthInterceptor;

    public WebSocketConfig(AuthProperties authProperties, SubscribeAuthInterceptor subscribeAuthInterceptor) {
        this.authProperties = authProperties;
        this.handshakeHandler = new WsHandshakeHandler();
        this.subscribeAuthInterceptor = subscribeAuthInterceptor;
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        // Native WebSocket (no SockJS) so the handshake stays a plain GET and CSRF
        // (POST-only) never applies. Origin is locked to the SPA, like the REST CORS.
        registry.addEndpoint("/ws")
                .setHandshakeHandler(handshakeHandler)
                .setAllowedOrigins(authProperties.getCors().getFrontendOrigin());
    }

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        registry.enableSimpleBroker("/topic");
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(subscribeAuthInterceptor);
    }

    @Override
    public boolean configureMessageConverters(List<MessageConverter> messageConverters) {
        // Jackson 2 to honour the SessionEvent @JsonTypeInfo discriminator and ISO-8601
        // Instants, matching RedisJsonCodec on the fan-out hop. Returning false means
        // this is the only converter (no auto-added Jackson 3 converter that would
        // ignore the Jackson 2 annotations).
        DefaultContentTypeResolver resolver = new DefaultContentTypeResolver();
        resolver.setDefaultMimeType(MimeTypeUtils.APPLICATION_JSON);

        ObjectMapper mapper = new ObjectMapper()
                .registerModule(new JavaTimeModule())
                .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);

        MappingJackson2MessageConverter converter = new MappingJackson2MessageConverter();
        converter.setObjectMapper(mapper);
        converter.setContentTypeResolver(resolver);
        messageConverters.add(converter);
        return false;
    }
}
