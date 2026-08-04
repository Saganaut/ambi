package com.cephadex.ambi.session.participant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Resolving an authenticated caller to their roster participant: {@code resolve}
 * returns the matching non-banned participant and throws {@link ForbiddenException}
 * when the caller has no user id, is not on the roster, or is banned; {@code find}
 * is the non-throwing counterpart, returning empty in those same cases.
 */
class ParticipantResolverTest {

    private static final String SID = "sess-1";

    private ParticipantRepository participants;
    private ParticipantResolver resolver;
    private LiveSession session;

    @BeforeEach
    void setUp() {
        participants = mock(ParticipantRepository.class);
        resolver = new ParticipantResolver(participants);
        session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
    }

    @Test
    void resolvesCallerToTheirRosterParticipant() {
        Participant p = onRoster("user-1");

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
        onRoster("user-1");

        assertThatThrownBy(() -> resolver.resolve(session, principal("user-2")))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsBannedParticipant() {
        onRoster("user-1").ban();

        assertThatThrownBy(() -> resolver.resolve(session, principal("user-1")))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── find (non-throwing) ──────────────────────────────────────────────────

    @Test
    void findReturnsRosterParticipant() {
        Participant p = onRoster("user-1");

        assertThat(resolver.find(session, principal("user-1"))).containsSame(p);
    }

    @Test
    void findIsEmptyWhenCallerNotOnRoster() {
        onRoster("user-1");

        assertThat(resolver.find(session, principal("user-2"))).isEmpty();
    }

    @Test
    void findIsEmptyWhenCallerHasNoUserId() {
        AmbiPrincipal visitor = new AmbiPrincipal(IdentityState.VISITOR, null, null, null,
                AuthProvider.INTERNAL, null, null, "sid-x");

        assertThat(resolver.find(session, visitor)).isEmpty();
    }

    /** Puts a live participant for {@code userId} on the session's roster. */
    private Participant onRoster(String userId) {
        Participant p = Participant.join(userId, "Name", null, null);
        p.joinSession(SID);
        when(participants.findFirstBySessionIdAndUserIdAndLeftAtIsNull(SID, userId)).thenReturn(Optional.of(p));
        return p;
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
