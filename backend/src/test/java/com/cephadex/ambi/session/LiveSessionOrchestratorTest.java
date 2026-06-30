package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.LiveResultsShown;
import com.cephadex.ambi.session.event.ResponsesRevealed;
import com.cephadex.ambi.session.event.RoundStarted;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SubmissionsLocked;
import com.cephadex.ambi.session.event.TallyUpdated;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.TallyStore;

/**
 * The round-lifecycle state machine: closing preserves what's displayed, results
 * require closed submissions, and the opening phase honours the slide's
 * ResultsDisplayMode.
 */
class LiveSessionOrchestratorTest {

    private static final String SID = "session-1";
    private static final String SLIDE = "slide-1";
    private static final String PUB = "pub-1";

    private LiveSessionRepository repo;
    private LiveRoundStateStore roundStateStore;
    private TallyStore tallyStore;
    private AnswerStore answerStore;
    private EventPublisher publisher;
    private LiveSessionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        repo = mock(LiveSessionRepository.class);
        ParticipantRepository participants = mock(ParticipantRepository.class);
        SessionLocks locks = mock(SessionLocks.class);
        roundStateStore = mock(LiveRoundStateStore.class);
        answerStore = mock(AnswerStore.class);
        tallyStore = mock(TallyStore.class);
        PresenceStore presenceStore = mock(PresenceStore.class);
        publisher = mock(EventPublisher.class);

        // Run the locked action inline.
        doAnswer(inv -> {
            ((Runnable) inv.getArgument(1)).run();
            return null;
        }).when(locks).withLock(anyString(), any(Runnable.class));

        orchestrator = new LiveSessionOrchestrator(
                repo, participants, locks, roundStateStore, answerStore, tallyStore, presenceStore, publisher);
    }

    private void stubPhase(RoundPhase phase) {
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(PUB, phase, SLIDE, Instant.now())));
    }

    private LiveRoundState savedState() {
        ArgumentCaptor<LiveRoundState> captor = ArgumentCaptor.forClass(LiveRoundState.class);
        verify(roundStateStore).save(eq(SID), captor.capture());
        return captor.getValue();
    }

    private SessionEvent publishedEvent() {
        ArgumentCaptor<SessionEvent> captor = ArgumentCaptor.forClass(SessionEvent.class);
        verify(publisher).publish(eq(PUB), captor.capture());
        return captor.getValue();
    }

    // ── closeSubmissions: preserve display ───────────────────────────────────

    @Test
    void closeFromHiddenLocksWithoutRevealing() {
        stubPhase(RoundPhase.SUBMIT);

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.LOCKED);
        // Entered LOCKED -> SubmissionsLocked, which carries no counts (leaks nothing).
        assertThat(publishedEvent()).isInstanceOf(SubmissionsLocked.class);
    }

    @Test
    void closeFromLiveKeepsResponsesShown() {
        stubPhase(RoundPhase.SUBMIT_LIVE);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-a", 2));

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESPONSES);
        ResponsesRevealed event = (ResponsesRevealed) publishedEvent();
        assertThat(event.optionCounts()).containsEntry("opt-a", 2);
    }

    @Test
    void closeIsIdempotentWhenAlreadyClosed() {
        stubPhase(RoundPhase.LOCKED);

        orchestrator.closeSubmissions(SID, SLIDE);

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    // ── revealResponses ──────────────────────────────────────────────────────

    @Test
    void revealResponsesWhileOpenGoesLive() {
        stubPhase(RoundPhase.SUBMIT);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.revealResponses(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT_LIVE);
        // Going live mid-round carries no slide (client has it from RoundStarted).
        LiveResultsShown event = (LiveResultsShown) publishedEvent();
        assertThat(event.slide()).isNull();
    }

    @Test
    void revealResponsesAfterLockRevealsThem() {
        stubPhase(RoundPhase.LOCKED);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.revealResponses(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESPONSES);
        assertThat(publishedEvent()).isInstanceOf(ResponsesRevealed.class);
    }

    // ── revealResults: requires closed ───────────────────────────────────────

    @Test
    void revealResultsFromClosedTransitions() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);

        orchestrator.revealResults(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
    }

    @Test
    void revealResultsWhileOpenIsRejected() {
        stubPhase(RoundPhase.SUBMIT_LIVE);

        assertThatThrownBy(() -> orchestrator.revealResults(SID, SLIDE))
                .isInstanceOf(IllegalStateException.class);
        verify(roundStateStore, never()).save(any(), any());
    }

    // ── startRound: honour ResultsDisplayMode ────────────────────────────────

    @Test
    void startRoundOpensLiveForImmediateMode() {
        givenSlideWithMode(ResultsDisplayMode.IMMEDIATE);

        orchestrator.startRound(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT_LIVE);
        assertThat(publishedEvent()).isInstanceOf(LiveResultsShown.class);
    }

    @Test
    void startRoundOpensHiddenForManualMode() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);

        orchestrator.startRound(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT);
        assertThat(publishedEvent()).isInstanceOf(RoundStarted.class);
    }

    private void givenSlideWithMode(ResultsDisplayMode mode) {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        slide.setSettings(new SlideSettings(null,
                new AnswerSettings(mode, false, false, false, 0, false, 1)));

        LiveSession session = mock(LiveSession.class);
        Deck deck = mock(Deck.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getPublicId()).thenReturn(PUB);
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
    }

    // ── submitAnswer ─────────────────────────────────────────────────────────

    @Test
    void submitSingleSelectFirstAnswerTalliesAndPublishes() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1")).thenReturn(Optional.empty());
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-a", 1));

        orchestrator.submitAnswer(SID, SLIDE, "p-1", new McqAnswer(Set.of("opt-a")), 1);

        verify(answerStore).submit(eq(SID), eq(SLIDE), any(Answer.class));
        verify(tallyStore).increment(SID, SLIDE, "opt-a");
        verify(tallyStore, never()).decrement(any(), any(), any());
        assertThat(publishedEvent()).isInstanceOf(TallyUpdated.class);
    }

    @Test
    void submitSingleSelectRepeatIsIgnored() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1"))
                .thenReturn(Optional.of(answerWith(new McqAnswer(Set.of("opt-a")))));

        orchestrator.submitAnswer(SID, SLIDE, "p-1", new McqAnswer(Set.of("opt-b")), 1);

        verify(answerStore, never()).submit(any(), any(), any());
        verify(tallyStore, never()).increment(any(), any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void submitMultiSelectChangeReconcilesTally() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1"))
                .thenReturn(Optional.of(answerWith(new McqAnswer(Set.of("opt-a")))));
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-b", 1));

        orchestrator.submitAnswer(SID, SLIDE, "p-1", new McqAnswer(Set.of("opt-b")), 0);

        verify(answerStore).submit(eq(SID), eq(SLIDE), any(Answer.class));
        verify(tallyStore).decrement(SID, SLIDE, "opt-a");
        verify(tallyStore).increment(SID, SLIDE, "opt-b");
        assertThat(publishedEvent()).isInstanceOf(TallyUpdated.class);
    }

    @Test
    void submitToClosedRoundIsRejected() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);

        assertThatThrownBy(() -> orchestrator.submitAnswer(SID, SLIDE, "p-1", new McqAnswer(Set.of("opt-a")), 1))
                .isInstanceOf(ConflictException.class);
        verify(answerStore, never()).submit(any(), any(), any());
        verify(tallyStore, never()).increment(any(), any(), any());
    }

    private static Answer answerWith(McqAnswer payload) {
        Answer a = new Answer();
        a.setParticipantId("p-1");
        a.setSessionId(SID);
        a.setSlideId(SLIDE);
        a.setSubmittedAt(Instant.now());
        a.setPayload(payload);
        return a;
    }
}
