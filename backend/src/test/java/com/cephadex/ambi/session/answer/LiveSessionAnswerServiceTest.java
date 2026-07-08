package com.cephadex.ambi.session.answer;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.exception.ValidationException;
import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.McqContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.ScalesContent;
import com.cephadex.ambi.presentation.slide.content.SlideContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqDataVisualization;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.session.LiveSessionOrchestrator;
import com.cephadex.ambi.session.answer.dto.SubmitAnswerRequest;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AxisAnswer;
import com.cephadex.ambi.session.answer.payload.GridAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.answer.payload.ScalesAnswer;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.user.enums.UserLevel;

/**
 * Unit tests for the HTTP-facing answer service: session lookup, anonymous-guard,
 * and payload validation against the slide, with participant resolution and the
 * orchestrator mocked so we assert only what is delegated.
 */
class LiveSessionAnswerServiceTest {

    private static final String SID = "session-1";
    private static final String SLIDE = "slide-1";

    private LiveSessionRepository sessions;
    private ParticipantResolver participantResolver;
    private LiveSessionOrchestrator orchestrator;
    private LiveSessionAnswerService service;

    private Participant participant;
    private AmbiPrincipal registered;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participantResolver = mock(ParticipantResolver.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        service = new LiveSessionAnswerService(sessions, participantResolver, orchestrator);

        participant = Participant.join("user-1", "Player One", null, null);
        registered = principal(IdentityState.REGISTERED, "user-1", UserLevel.USER);
    }

    @Test
    void happyPathDelegatesWithResolvedParticipantAndMaxSelections() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a", "opt-b"));

        service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a"))), registered);

        verify(orchestrator).submitAnswer(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(McqAnswer.class), eq(1));
    }

    @Test
    void missingSessionIsNotFound() {
        when(sessions.findById(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a"))), registered))
                .isInstanceOf(NotFoundException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void sessionNotInProgressIsConflict() {
        LiveSession session = mock(LiveSession.class);
        when(session.isLive()).thenReturn(false);
        when(sessions.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a"))), registered))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void participantResolutionRejectionPropagates() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a"));
        when(participantResolver.resolve(any(), any()))
                .thenThrow(new ForbiddenException("NOT_A_PARTICIPANT", "no"));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a"))), registered))
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

        assertThatThrownBy(
                () -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a", "opt-b"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void unknownOptionIsRejected() {
        givenLiveSession(answerSettings(true, 1), mcqContent("opt-a"));

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-x"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void guestBlockedWhenSlideForbidsAnonymous() {
        givenLiveSession(answerSettings(false, 1), mcqContent("opt-a"));
        AmbiPrincipal guest = principal(IdentityState.GUEST, "user-1", UserLevel.GUEST);

        assertThatThrownBy(() -> service.submit(SID, request(new McqAnswer(java.util.Set.of("opt-a"))), guest))
                .isInstanceOf(ForbiddenException.class);
    }

    // ── Grid ───────────────────────────────────────────────────────────────────

    @Test
    void gridPlacementsBypassTheSingleAnswerRule() {
        givenLiveSession(answerSettings(true, 1), gridContent());

        service.submit(SID, request(new GridAnswer(java.util.Map.of("it-1", "0,1"))), registered);

        // maxSelections is an MCQ knob; grid resubmits must overwrite, so the
        // orchestrator is called with 0 (unlimited / last-write-wins).
        verify(orchestrator).submitAnswer(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(GridAnswer.class), eq(0));
    }

    @Test
    void gridEmptyPlacementsAreRejected() {
        givenLiveSession(answerSettings(true, 1), gridContent());

        assertThatThrownBy(() -> service.submit(SID, request(new GridAnswer(java.util.Map.of())), registered))
                .isInstanceOf(ValidationException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void gridUnknownItemIsRejected() {
        givenLiveSession(answerSettings(true, 1), gridContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new GridAnswer(java.util.Map.of("it-nope", "0,0"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void gridOutOfBoundsOrMalformedCellIsRejected() {
        givenLiveSession(answerSettings(true, 1), gridContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new GridAnswer(java.util.Map.of("it-1", "2,0"))), registered))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.submit(SID,
                request(new GridAnswer(java.util.Map.of("it-1", "not-a-cell"))), registered))
                .isInstanceOf(ValidationException.class);
    }

    // ── Axis ───────────────────────────────────────────────────────────────────

    @Test
    void axisPlacementsBypassTheSingleAnswerRule() {
        givenLiveSession(answerSettings(true, 1), axisContent());

        service.submit(SID, request(new AxisAnswer(java.util.Map.of("it-1", new AxisPoint(0.4, 0.6)))), registered);

        // Like grid, an axis resubmit must overwrite rather than lock on first
        // submit, so the orchestrator is called with 0 (last-write-wins).
        verify(orchestrator).submitAnswer(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(AxisAnswer.class), eq(0));
    }

    @Test
    void axisEmptyPlacementsAreRejected() {
        givenLiveSession(answerSettings(true, 1), axisContent());

        assertThatThrownBy(() -> service.submit(SID, request(new AxisAnswer(java.util.Map.of())), registered))
                .isInstanceOf(ValidationException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void axisUnknownItemIsRejected() {
        givenLiveSession(answerSettings(true, 1), axisContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new AxisAnswer(java.util.Map.of("it-nope", new AxisPoint(0.5, 0.5)))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void axisOutOfBoundsOrNonFinitePointIsRejected() {
        givenLiveSession(answerSettings(true, 1), axisContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new AxisAnswer(java.util.Map.of("it-1", new AxisPoint(1.2, 0.5)))), registered))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.submit(SID,
                request(new AxisAnswer(java.util.Map.of("it-1", new AxisPoint(0.5, -0.01)))), registered))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.submit(SID,
                request(new AxisAnswer(java.util.Map.of("it-1", new AxisPoint(Double.NaN, 0.5)))), registered))
                .isInstanceOf(ValidationException.class);
    }

    // ── Scales ───────────────────────────────────────────────────────────────

    @Test
    void scalesPositionsBypassTheSingleAnswerRule() {
        givenLiveSession(answerSettings(true, 1), scalesContent());

        service.submit(SID, request(new ScalesAnswer(java.util.Map.of("it-1", 0.4))), registered);

        // Like grid/axis, a scales resubmit must overwrite rather than lock on
        // first submit, so the orchestrator is called with 0 (last-write-wins).
        verify(orchestrator).submitAnswer(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(ScalesAnswer.class), eq(0));
    }

    @Test
    void scalesEmptyPositionsAreRejected() {
        givenLiveSession(answerSettings(true, 1), scalesContent());

        assertThatThrownBy(() -> service.submit(SID, request(new ScalesAnswer(java.util.Map.of())), registered))
                .isInstanceOf(ValidationException.class);
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void scalesUnknownStatementIsRejected() {
        givenLiveSession(answerSettings(true, 1), scalesContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new ScalesAnswer(java.util.Map.of("it-nope", 0.5))), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void scalesOutOfBoundsOrNonFinitePositionIsRejected() {
        givenLiveSession(answerSettings(true, 1), scalesContent());

        assertThatThrownBy(() -> service.submit(SID,
                request(new ScalesAnswer(java.util.Map.of("it-1", 1.2))), registered))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.submit(SID,
                request(new ScalesAnswer(java.util.Map.of("it-1", -0.01))), registered))
                .isInstanceOf(ValidationException.class);
        assertThatThrownBy(() -> service.submit(SID,
                request(new ScalesAnswer(java.util.Map.of("it-1", Double.NaN))), registered))
                .isInstanceOf(ValidationException.class);
    }

    // ── Q&A ────────────────────────────────────────────────────────────────────

    @Test
    void qandaQuestionTakesTheDedicatedOrchestratorPath() {
        givenLiveSession(answerSettings(true, 1), new QAndAContent(3, false));

        service.submit(SID, request(new QAndAAnswer("Why though?")), registered);

        verify(orchestrator).submitQuestion(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(QAndAAnswer.class), eq(3), eq(false));
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    @Test
    void qandaAnonymizeSettingTravelsToTheOrchestrator() {
        givenLiveSession(anonymizedAnswerSettings(), new QAndAContent(null, false));

        service.submit(SID, request(new QAndAAnswer("Who said that?")), registered);

        verify(orchestrator).submitQuestion(eq(SID), eq(SLIDE), eq(participant.getParticipantId()),
                any(QAndAAnswer.class), eq((Integer) null), eq(true));
    }

    @Test
    void qandaBlankQuestionIsRejected() {
        givenLiveSession(answerSettings(true, 1), new QAndAContent(null, false));

        assertThatThrownBy(() -> service.submit(SID, request(new QAndAAnswer("   ")), registered))
                .isInstanceOf(ValidationException.class);
        verify(orchestrator, never()).submitQuestion(any(), any(), any(), any(), any(), anyBoolean());
    }

    @Test
    void qandaOverlongQuestionIsRejected() {
        givenLiveSession(answerSettings(true, 1), new QAndAContent(null, false));
        String tooLong = "x".repeat(ValidationConstants.QANDA_QUESTION_MAX + 1);

        assertThatThrownBy(() -> service.submit(SID, request(new QAndAAnswer(tooLong)), registered))
                .isInstanceOf(ValidationException.class);
    }

    @Test
    void qandaStoredAggregateShapeIsRejectedFromClients() {
        givenLiveSession(answerSettings(true, 1), new QAndAContent(null, false));
        AnswerPayload storedShape = new QAndAQuestions(List.of());

        assertThatThrownBy(() -> service.submit(SID, request(storedShape), registered))
                .isInstanceOf(ValidationException.class);
        verify(orchestrator, never()).submitQuestion(any(), any(), any(), any(), any(), anyBoolean());
        verify(orchestrator, never()).submitAnswer(any(), any(), any(), any(), anyInt());
    }

    // ── fixtures ───────────────────────────────────────────────────────────────

    private void givenLiveSession(AnswerSettings answer, SlideContent content) {
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

        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participantResolver.resolve(any(), any())).thenReturn(participant);
    }

    private static SubmitAnswerRequest request(AnswerPayload payload) {
        return new SubmitAnswerRequest(SLIDE, payload);
    }

    private static AnswerSettings answerSettings(boolean allowAnonymous, int maxSelections) {
        return new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, false, 0, allowAnonymous, maxSelections);
    }

    private static AnswerSettings anonymizedAnswerSettings() {
        return new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, true, 0, true, 1);
    }

    /** A 2×2 grid with two items ("it-1", "it-2") and no answer key. */
    private static GridContent gridContent() {
        return new GridContent(
                List.of("Row A", "Row B"),
                List.of("Col A", "Col B"),
                List.of(new GridItem("it-1", "One", null), new GridItem("it-2", "Two", null)),
                java.util.Map.of(),
                ScoreMode.EXACT);
    }

    /** An axis plane with two items ("it-1", "it-2") and no answer key. */
    private static AxisContent axisContent() {
        return new AxisContent(
                "Low X", "High X", "Low Y", "High Y",
                List.of(new AxisItem("it-1", "One", null, null), new AxisItem("it-2", "Two", null, null)),
                java.util.Map.of(),
                0.1,
                ScoreMode.INSIDE_RADIUS);
    }

    /** A 1–5 scale with two statements ("it-1", "it-2") and no answer key. */
    private static ScalesContent scalesContent() {
        return new ScalesContent(
                1, 5, "Low", "High",
                List.of(new ScaleItem("it-1", "One"), new ScaleItem("it-2", "Two")),
                java.util.Map.of(),
                1.0);
    }

    private static McqContent mcqContent(String... optionIds) {
        List<McqOption> options = java.util.Arrays.stream(optionIds)
                .map(id -> new McqOption(id, null, id, null, null))
                .toList();
        return new McqContent(options, java.util.Set.of(optionIds[0]), McqDataVisualization.NONE);
    }

    private static AmbiPrincipal principal(IdentityState state, String userId, UserLevel level) {
        return new AmbiPrincipal(state, userId, "pub-" + userId, level,
                AuthProvider.INTERNAL, null, null, "sid-" + userId);
    }
}
