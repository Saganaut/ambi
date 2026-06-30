package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.DeckService;
import com.cephadex.ambi.session.LiveSessionOrchestrator.JoinResult;
import com.cephadex.ambi.session.dto.CreateSessionRequest;
import com.cephadex.ambi.session.dto.CreateSessionResponse;
import com.cephadex.ambi.session.dto.JoinSessionRequest;
import com.cephadex.ambi.session.dto.JoinSessionResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.User;
import com.cephadex.ambi.user.UserService;
import com.cephadex.ambi.user.enums.UserLevel;

class LiveSessionLobbyServiceTest {

    private static final String SID = "session-1";

    private DeckService deckService;
    private UserService userService;
    private LiveSessionRepository sessions;
    private LiveSessionOrchestrator orchestrator;
    private ParticipantResolver participantResolver;
    private LiveSessionLobbyService service;

    private AmbiPrincipal host;

    @BeforeEach
    void setUp() {
        deckService = mock(DeckService.class);
        userService = mock(UserService.class);
        sessions = mock(LiveSessionRepository.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        participantResolver = mock(ParticipantResolver.class);
        service = new LiveSessionLobbyService(deckService, userService, sessions, orchestrator, participantResolver);
        host = principal("user-1");
    }

    @Test
    void createLoadsViewableDeckAndHostProfileThenDelegates() {
        Deck deck = mock(Deck.class);
        when(deckService.getViewable("deck-1", host)).thenReturn(deck);
        User user = mock(User.class);
        when(user.getDisplayName()).thenReturn("Hosty");
        when(user.getAvatar()).thenReturn(null);
        when(userService.requireUser("user-1")).thenReturn(user);
        LiveSession session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn("pub-1");
        when(session.getRoomCode()).thenReturn("ABCDEFGH");
        when(session.getHostParticipantId()).thenReturn("host-pid");
        when(orchestrator.createSession("user-1", "Hosty", null, deck)).thenReturn(session);

        CreateSessionResponse response = service.createSession(new CreateSessionRequest("deck-1"), host);

        assertThat(response.roomCode()).isEqualTo("ABCDEFGH");
        assertThat(response.publicId()).isEqualTo("pub-1");
        assertThat(response.hostParticipantId()).isEqualTo("host-pid");
    }

    @Test
    void joinDelegatesAndBuildsResponse() {
        LiveSession session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn("pub-1");
        Participant participant = Participant.join("user-2", "Player", null, null);
        when(orchestrator.join("ABCDEFGH", "user-1", "Player", null, null))
                .thenReturn(new JoinResult(session, participant));

        JoinSessionResponse response = service.join(new JoinSessionRequest("ABCDEFGH", "Player", null, null), host);

        assertThat(response.publicId()).isEqualTo("pub-1");
        assertThat(response.participantId()).isEqualTo(participant.getParticipantId());
    }

    @Test
    void startRequiresHostThenBeginsPlay() {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-1", "Host", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, host)).thenReturn(p);
        when(session.isHost(p.getParticipantId())).thenReturn(true);

        service.start(SID, host);

        verify(orchestrator).beginPlay(SID);
    }

    @Test
    void startByNonHostIsForbidden() {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-2", "Player", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, host)).thenReturn(p);
        when(session.isHost(p.getParticipantId())).thenReturn(false);

        assertThatThrownBy(() -> service.start(SID, host)).isInstanceOf(ForbiddenException.class);
        verify(orchestrator, never()).beginPlay(any());
    }

    @Test
    void startOnMissingSessionIsNotFound() {
        when(sessions.findById(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.start(SID, host)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void leaveResolvesCallerThenDelegates() {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-1", "Player", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, host)).thenReturn(p);

        service.leave(SID, host);

        verify(orchestrator).leave(SID, p.getParticipantId());
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
