package com.cephadex.ambi.session.participant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.user.enums.UserLevel;

class ParticipantResolverTest {

    private ParticipantRepository participants;
    private ParticipantResolver resolver;
    private LiveSession session;

    @BeforeEach
    void setUp() {
        participants = mock(ParticipantRepository.class);
        resolver = new ParticipantResolver(participants);
        session = mock(LiveSession.class);
        when(session.getRoster()).thenReturn(List.of("p-1"));
    }

    @Test
    void resolvesCallerToTheirRosterParticipant() {
        Participant p = Participant.join("user-1", "Name", null, null);
        when(participants.findAllById(any())).thenReturn(List.of(p));

        assertThat(resolver.resolve(session, principal("user-1"))).isSameAs(p);
    }

    @Test
    void rejectsWhenCallerHasNoUserId() {
        AmbiPrincipal visitor = new AmbiPrincipal(IdentityState.VISITOR, null, null, null,
                AuthProvider.INTERNAL, null, null, "sid-x");

        assertThatThrownBy(() -> resolver.resolve(session, visitor)).isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsWhenCallerNotOnRoster() {
        Participant p = Participant.join("user-1", "Name", null, null);
        when(participants.findAllById(any())).thenReturn(List.of(p));

        assertThatThrownBy(() -> resolver.resolve(session, principal("user-2")))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsBannedParticipant() {
        Participant p = Participant.join("user-1", "Name", null, null);
        p.ban();
        when(participants.findAllById(any())).thenReturn(List.of(p));

        assertThatThrownBy(() -> resolver.resolve(session, principal("user-1")))
                .isInstanceOf(ForbiddenException.class);
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
