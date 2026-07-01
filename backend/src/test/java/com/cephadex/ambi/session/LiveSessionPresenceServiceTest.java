package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Presence self-service: resolve the caller to their roster participant, then
 * delegate the presence update to the orchestrator.
 */
class LiveSessionPresenceServiceTest {

    private static final String SID = "session-1";

    private LiveSessionRepository sessions;
    private ParticipantResolver participantResolver;
    private LiveSessionOrchestrator orchestrator;
    private LiveSessionPresenceService service;

    private AmbiPrincipal caller;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participantResolver = mock(ParticipantResolver.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        service = new LiveSessionPresenceService(sessions, participantResolver, orchestrator);
        caller = principal("user-1");
    }

    @Test
    void reconnectResolvesCallerThenDelegates() {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-1", "Player", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, caller)).thenReturn(p);

        service.reconnect(SID, caller);

        verify(orchestrator).reconnect(SID, p.getParticipantId());
    }

    @Test
    void heartbeatResolvesCallerThenDelegates() {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-1", "Player", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, caller)).thenReturn(p);

        service.heartbeat(SID, caller);

        verify(orchestrator).heartbeat(SID, p.getParticipantId());
    }

    @Test
    void missingSessionIsNotFound() {
        when(sessions.findById(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.reconnect(SID, caller)).isInstanceOf(NotFoundException.class);
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
