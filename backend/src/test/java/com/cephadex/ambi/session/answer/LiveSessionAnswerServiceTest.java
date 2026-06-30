package com.cephadex.ambi.session.answer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Unit tests for the HTTP-facing answer service: session/participant resolution and
 * payload validation against the slide, with the orchestrator mocked so we assert
 * only what is delegated (resolved participantId + maxSelections).
 */
class LiveSessionAnswerServiceTest {

    private static final String SID = "session-1";
    private static final String SLIDE = "slide-1";

    private LiveSessionRepository sessions;
    private ParticipantRepository participants;
    private LiveSessionOrchestrator orchestrator;
    private LiveSessionAnswerService service;

    private Participant participant;
    private AmbiPrincipal registered;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        service = new LiveSessionAnswerService(sessions, participants, orchestrator);

        participant = Participant.join("user-1", "Player One", null, null);
        registered = principal(IdentityState.REGISTERED, "user-1", UserLevel.USER);
    }

    @Test
    void happyPathDelegatesWithResolvedParticipantAndMaxSelections() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a", "opt-b"));

        service.submit(SID, request(new McqAnswer(Set.of("opt-a"))), registered);

        verify(orchestrator).submitAnswer(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(McqAnswer.class), eq(1));
    }

    @Test
    void missingSessionIsNotFound() {
        when(sessions.findById(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-a"))), registered))
                .isInstanceOf(NotFoundException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void sessionNotInProgressIsConflict() {
        LiveSession session = mock(LiveSession.class);
        when(session.isLive()).thenReturn(false);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-a"))), registered))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void callerNotOnRosterIsForbidden() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a"));
        AmbiPrincipal stranger = principal(IdentityState.REGISTERED, "user-2", UserLevel.USER);

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-a"))), stranger))
                .isInstanceOf(ForbiddenException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void payloadOfWrongTypeForSlideIsRejected() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a"));

        assertThatThrownBy(() -> service.submit(SID, request(new NumberAnswer(42)), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void moreSelectionsThanAllowedIsRejected() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a", "opt-b"));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-a", "opt-b"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void unknownOptionIsRejected() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a"));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-x"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void guestBlockedWhenSlideForbidsAnonymous() {
        givenLiveSession(answerSettings(false, 1), mcqContent("opt-a"));
        // The guest must still be on the roster to reach the anonymous check.
        participant = Participant.join("guest-1", "Guest", null, null);
        when(participants.findAllById(any())).thenReturn(List.of(participant));
        AmbiPrincipal guest = principal(IdentityState.GUEST, "guest-1", UserLevel.GUEST);

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(Set.of("opt-a"))), guest))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── fixtures ───────────────────────────────────────────────────────────────

    private void givenLiveSession(AnswerSettings answer, McqContent content) {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        slide.setContent(content);
        slide.setSettings(new SlideSettings(null, answer));

        Deck deck = mock(Deck.class);
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        when(deck.getSettings()).thenReturn(null);

        LiveSession session = mock(LiveSession.class);
        when(session.isLive()).thenReturn(true);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of(participant.getParticipantId()));

        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(any())).thenReturn(List.of(participant));
    }

    private static SubmitAnswerRequest request(com.cephadex.ambi.session.answer.payload.AnswerPayload payload) {
        return new SubmitAnswerRequest(SLIDE, payload);
    }

    private static AnswerSettings answerSettings(boolean allowAnonymous, int maxSelections) {
        return new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, false, 0, allowAnonymous, maxSelections);
    }

    private static McqContent mcqContent(String... optionIds) {
        List<McqOption> options = java.util.Arrays.stream(optionIds)
                .map(id -> new McqOption(id, null, id, null, null))
                .toList();
        return new McqContent(options, Set.of(optionIds[0]), McqDataVisualization.NONE);
    }

    private static AmbiPrincipal principal(IdentityState state, String userId, UserLevel level) {
        return new AmbiPrincipal(state, userId, "pub-" + userId, level,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
