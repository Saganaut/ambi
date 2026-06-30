package com.cephadex.ambi.session.transport;

import java.security.Principal;

import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;

/**
 * Authorizes STOMP {@code SUBSCRIBE} frames to session topics. STOMP frames don't
 * traverse the servlet security chain (that only runs on the HTTP handshake), so
 * this inbound-channel interceptor is where per-subscription access is enforced.
 *
 * <p><strong>v1 posture (open-decisions C2):</strong> the {@code publicId} in the
 * destination is a random UUID, so any authenticated, non-visitor principal
 * (registered users <em>and</em> guests) who knows it may subscribe. The tighter
 * "is this principal actually on the session roster" check waits on the
 * participant token; the TODO below marks where it goes.
 */
@Component
public class SubscribeAuthInterceptor implements ChannelInterceptor {

    private static final String SESSION_TOPIC_PREFIX = "/topic/liveSession/";

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(message);
        if (!StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            return message;
        }
        String destination = accessor.getDestination();
        if (destination == null || !destination.startsWith(SESSION_TOPIC_PREFIX)) {
            return message;
        }
        if (!isAuthenticated(accessor.getUser())) {
            throw new MessagingException("authentication required to subscribe to a session topic");
        }
        // TODO(C2): once the participant token exists, resolve the principal to a
        // participantId and reject if it is not on this session's roster.
        return message;
    }

    private static boolean isAuthenticated(Principal user) {
        if (!(user instanceof Authentication auth) || !auth.isAuthenticated()) {
            return false;
        }
        if (auth.getPrincipal() instanceof AmbiPrincipal principal) {
            return principal.state() != IdentityState.VISITOR;
        }
        return false;
    }
}
