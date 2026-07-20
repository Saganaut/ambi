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
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.ParticipantResolver;

/**
 * Authorizes STOMP {@code SUBSCRIBE} frames to session topics. STOMP frames don't
 * traverse the servlet security chain (that only runs on the HTTP handshake), so
 * this inbound-channel interceptor is where per-subscription access is enforced.
 *
 * <p>A {@code SUBSCRIBE} to {@code /topic/liveSession/<publicId>} is admitted only
 * when the subscriber is on that session's roster (host or participant). The check
 * mirrors the REST command surface: the subscriber's {@link AmbiPrincipal} is
 * resolved to a non-banned participant on the session's roster via the shared
 * {@link ParticipantResolver}. Knowing the {@code publicId} is not sufficient —
 * closing the gap where any authenticated, non-visitor caller who learned the id
 * could eavesdrop on a session they never joined (open-decisions C2).
 *
 * <p>The topic carries the session's {@code publicId} (see
 * {@code LiveSessionStompRelay}), not its Mongo id, so authorization loads the
 * session by {@code publicId}. Roster membership resolves off the persisted
 * {@code Participant.userId} — the same identity the REST endpoints authorize on;
 * the userId is only stripped from the wire DTOs, never from the stored document.
 */
@Component
public class SubscribeAuthInterceptor implements ChannelInterceptor {

    private static final String SESSION_TOPIC_PREFIX = "/topic/liveSession/";

    private final LiveSessionRepository sessions;
    private final ParticipantResolver participantResolver;

    public SubscribeAuthInterceptor(LiveSessionRepository sessions, ParticipantResolver participantResolver) {
        this.sessions = sessions;
        this.participantResolver = participantResolver;
    }

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
        AmbiPrincipal principal = authenticatedPrincipal(accessor.getUser());
        if (principal == null) {
            throw new MessagingException("authentication required to subscribe to a session topic");
        }
        String publicId = destination.substring(SESSION_TOPIC_PREFIX.length());
        if (publicId.isEmpty() || publicId.indexOf('/') >= 0) {
            throw new MessagingException("malformed session topic destination");
        }
        LiveSession session = sessions.findByPublicId(publicId)
                .orElseThrow(() -> new MessagingException("no session for that topic"));
        if (participantResolver.find(session, principal).isEmpty()) {
            throw new MessagingException("not a participant in this session");
        }
        return message;
    }

    /**
     * The authenticated, non-visitor {@link AmbiPrincipal} behind the STOMP session,
     * or {@code null} when the frame carries no usable identity (unauthenticated,
     * a non-{@code AmbiPrincipal} authentication, or a bare visitor). Visitors are
     * rejected because they have no user id and so can never be on a roster.
     */
    private static AmbiPrincipal authenticatedPrincipal(Principal user) {
        if (!(user instanceof Authentication auth) || !auth.isAuthenticated()) {
            return null;
        }
        if (auth.getPrincipal() instanceof AmbiPrincipal principal && principal.state() != IdentityState.VISITOR) {
            return principal;
        }
        return null;
    }
}
