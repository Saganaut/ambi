package com.cephadex.ambi.session.transport;

import java.security.Principal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
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
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Subscribe authorization against the session roster: a SUBSCRIBE to a session
 * topic is admitted only for a caller resolved to a non-banned participant on that
 * session's roster; an unauthenticated, visitor, non-roster, or unknown-session
 * SUBSCRIBE is rejected; non-session destinations and non-SUBSCRIBE frames pass
 * through untouched, and a topic with no valid publicId is rejected.
 */
class SubscribeAuthInterceptorTest {

    private static final String PUBLIC_ID = "pub-1";
    private static final String DESTINATION = "/topic/liveSession/" + PUBLIC_ID;

    private LiveSessionRepository sessions;
    private ParticipantRepository participants;
    private SubscribeAuthInterceptor interceptor;
    private LiveSession session;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        // Real resolver over a mocked repository: exercises the actual roster logic.
        interceptor = new SubscribeAuthInterceptor(sessions, new ParticipantResolver(participants));
        session = mock(LiveSession.class);
        when(session.getRoster()).thenReturn(List.of("p-1"));
    }

    // ── admitted ──────────────────────────────────────────────────────────────

    @Test
    void rosterParticipantMaySubscribeToSessionTopic() {
        onRoster(Participant.join("user-1", "Name", null, null));
        Message<byte[]> message = subscribe(DESTINATION, auth(principal(IdentityState.GUEST, "user-1")));

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
    }

    // ── rejected ──────────────────────────────────────────────────────────────

    @Test
    void nonRosterPrincipalIsRejected() {
        onRoster(Participant.join("user-1", "Name", null, null));
        Message<byte[]> message = subscribe(DESTINATION, auth(principal(IdentityState.REGISTERED, "user-2")));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void bannedRosterParticipantIsRejected() {
        Participant banned = Participant.join("user-1", "Name", null, null);
        banned.ban();
        onRoster(banned);
        Message<byte[]> message = subscribe(DESTINATION, auth(principal(IdentityState.GUEST, "user-1")));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void unauthenticatedSubscribeIsRejected() {
        Message<byte[]> message = subscribe(DESTINATION, null);

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
        // Rejected before any roster lookup — no identity to authorize.
        verify(sessions, never()).findByPublicId(any());
    }

    @Test
    void visitorSubscribeIsRejected() {
        Message<byte[]> message = subscribe(DESTINATION, auth(principal(IdentityState.VISITOR, null)));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
        verify(sessions, never()).findByPublicId(any());
    }

    @Test
    void unknownSessionIsRejected() {
        when(sessions.findByPublicId(PUBLIC_ID)).thenReturn(Optional.empty());
        Message<byte[]> message = subscribe(DESTINATION, auth(principal(IdentityState.GUEST, "user-1")));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void topicWithoutPublicIdIsRejected() {
        Message<byte[]> message = subscribe("/topic/liveSession/", auth(principal(IdentityState.GUEST, "user-1")));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
    }

    @Test
    void topicWithSubPathIsRejected() {
        Message<byte[]> message =
                subscribe(DESTINATION + "/extra", auth(principal(IdentityState.GUEST, "user-1")));

        assertThatThrownBy(() -> interceptor.preSend(message, null)).isInstanceOf(MessagingException.class);
        // A sub-path probe never resolves to a session — rejected before any lookup.
        verify(sessions, never()).findByPublicId(any());
    }

    // ── not gated ─────────────────────────────────────────────────────────────

    @Test
    void nonSessionDestinationIsNotGated() {
        Message<byte[]> message = subscribe("/topic/other", null);

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
        verify(sessions, never()).findByPublicId(any());
    }

    @Test
    void nonSubscribeFrameIsNotGated() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SEND);
        accessor.setDestination(DESTINATION);
        Message<byte[]> message = MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());

        assertThat(interceptor.preSend(message, null)).isSameAs(message);
        verify(sessions, never()).findByPublicId(any());
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    private void onRoster(Participant participant) {
        when(sessions.findByPublicId(PUBLIC_ID)).thenReturn(Optional.of(session));
        when(participants.findAllById(any())).thenReturn(List.of(participant));
    }

    private static Authentication auth(AmbiPrincipal principal) {
        return new UsernamePasswordAuthenticationToken(principal, null, List.of());
    }

    private static AmbiPrincipal principal(IdentityState state, String userId) {
        return new AmbiPrincipal(state, userId, "pub", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sess-1");
    }

    private static Message<byte[]> subscribe(String destination, Principal user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (user != null) {
            accessor.setUser(user);
        }
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }
}
