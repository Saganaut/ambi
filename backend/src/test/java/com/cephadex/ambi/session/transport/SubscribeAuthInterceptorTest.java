package com.cephadex.ambi.session.transport;

import java.security.Principal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * v1 subscribe authorization: an authenticated, non-visitor principal (guest or
 * registered) may subscribe to a session topic; an unauthenticated SUBSCRIBE is
 * rejected; non-session destinations and non-SUBSCRIBE frames are untouched.
 */
class SubscribeAuthInterceptorTest {

    private final SubscribeAuthInterceptor interceptor = new SubscribeAuthInterceptor();

    private static Authentication principal(IdentityState state) {
        AmbiPrincipal p = new AmbiPrincipal(state, "u1", "pub", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sess-1");
        return new UsernamePasswordAuthenticationToken(p, null, List.of());
    }

    private static Message<byte[]> subscribe(String destination, Principal user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (user != null) {
            accessor.setUser(user);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void guestMaySubscribeToSessionTopic() {
        Message<byte[]> message = subscribe("/topic/liveSession/pub-1", principal(IdentityState.GUEST));
        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    @Test
    void unauthenticatedSubscribeIsRejected() {
        Message<byte[]> message = subscribe("/topic/liveSession/pub-1", null);
        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(MessagingException.class);
    }

    @Test
    void visitorSubscribeIsRejected() {
        Message<byte[]> message = subscribe("/topic/liveSession/pub-1", principal(IdentityState.VISITOR));
        assertThatThrownBy(() -> interceptor.preSend(message, null))
                .isInstanceOf(MessagingException.class);
    }

    @Test
    void nonSessionDestinationIsNotGated() {
        Message<byte[]> message = subscribe("/topic/other", null);
        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    @Test
    void nonSubscribeFrameIsNotGated() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination("/topic/liveSession/pub-1");
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }
}
