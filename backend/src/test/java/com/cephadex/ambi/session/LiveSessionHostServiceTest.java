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
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.dto.AdvanceResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Host round &amp; navigation control: every command is host-gated, then delegates to
 * the orchestrator. advance() maps the opened slide (or exhaustion) to its response.
 */
class LiveSessionHostServiceTest {

    private static final String SID = "session-1";
    private static final String SLIDE = "slide-1";

    private LiveSessionRepository sessions;
    private ParticipantResolver participantResolver;
    private LiveSessionOrchestrator orchestrator;
    private LiveSessionHostService service;

    private AmbiPrincipal caller;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participantResolver = mock(ParticipantResolver.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        service = new LiveSessionHostService(sessions, participantResolver, orchestrator);
        caller = principal("user-1");
    }

    private LiveSession asHost(boolean isHost) {
        LiveSession session = mock(LiveSession.class);
        Participant p = Participant.join("user-1", "Host", null, null);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(session, caller)).thenReturn(p);
        when(session.isHost(p.getParticipantId())).thenReturn(isHost);
        return session;
    }

    @Test
    void closeSubmissionsRequiresHostThenDelegates() {
        asHost(true);

        service.closeSubmissions(SID, SLIDE, caller);

        verify(orchestrator).closeSubmissions(SID, SLIDE);
    }

    @Test
    void openVotingRequiresHostThenDelegates() {
        asHost(true);

        service.openVoting(SID, SLIDE, caller);

        verify(orchestrator).openVoting(SID, SLIDE);
    }

    @Test
    void nonHostCannotOpenVoting() {
        asHost(false);

        assertThatThrownBy(() -> service.openVoting(SID, SLIDE, caller))
                .isInstanceOf(ForbiddenException.class);
        verify(orchestrator, never()).openVoting(any(), any());
    }

    @Test
    void nonHostIsForbiddenAndDoesNotDelegate() {
        asHost(false);

        assertThatThrownBy(() -> service.revealResults(SID, SLIDE, caller))
                .isInstanceOf(ForbiddenException.class);
        verify(orchestrator, never()).revealResults(any(), any());
    }

    @Test
    void missingSessionIsNotFound() {
        when(sessions.findById(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.goTo(SID, SLIDE, caller)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void advanceReturnsOpenedSlide() {
        asHost(true);
        Slide slide = new Slide();
        slide.setId("slide-9");
        when(orchestrator.advance(SID)).thenReturn(slide);

        AdvanceResponse response = service.advance(SID, caller);

        assertThat(response.slideId()).isEqualTo("slide-9");
        assertThat(response.terminal()).isFalse();
    }

    @Test
    void advanceReturnsTerminalWhenExhausted() {
        asHost(true);
        when(orchestrator.advance(SID)).thenReturn(null);

        AdvanceResponse response = service.advance(SID, caller);

        assertThat(response.slideId()).isNull();
        assertThat(response.terminal()).isTrue();
    }

    private static AmbiPrincipal principal(String userId) {
        return new AmbiPrincipal(IdentityState.REGISTERED, userId, "pub-" + userId, UserLevel.USER,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
