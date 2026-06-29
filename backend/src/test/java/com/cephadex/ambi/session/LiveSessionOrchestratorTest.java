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

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.RoundStarted;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SubmissionsClosed;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionStateStore;
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
    private SessionStateStore stateStore;
    private TallyStore tallyStore;
    private AnswerStore answerStore;
    private EventPublisher publisher;
    private LiveSessionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        repo = mock(LiveSessionRepository.class);
        ParticipantRepository participants = mock(ParticipantRepository.class);
        SessionLocks locks = mock(SessionLocks.class);
        stateStore = mock(SessionStateStore.class);
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
                repo, participants, locks, stateStore, answerStore, tallyStore, presenceStore, publisher);
    }

    private void stubPhase(RoundPhase phase) {
        when(stateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(PUB, phase, SLIDE, Instant.now())));
    }

    private LiveRoundState savedState() {
        ArgumentCaptor<LiveRoundState> captor = ArgumentCaptor.forClass(LiveRoundState.class);
        verify(stateStore).save(eq(SID), captor.capture());
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
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-a", 2));

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.LOCKED);
        SubmissionsClosed event = (SubmissionsClosed) publishedEvent();
        assertThat(event.phase()).isEqualTo(RoundPhase.LOCKED);
        assertThat(event.optionCounts()).isEmpty(); // hidden lock leaks nothing
    }

    @Test
    void closeFromLiveKeepsResponsesShown() {
        stubPhase(RoundPhase.SUBMIT_LIVE);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-a", 2));

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESPONSES);
        SubmissionsClosed event = (SubmissionsClosed) publishedEvent();
        assertThat(event.optionCounts()).containsEntry("opt-a", 2);
    }

    @Test
    void closeIsIdempotentWhenAlreadyClosed() {
        stubPhase(RoundPhase.LOCKED);

        orchestrator.closeSubmissions(SID, SLIDE);

        verify(stateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    // ── revealResponses ──────────────────────────────────────────────────────

    @Test
    void revealResponsesWhileOpenGoesLive() {
        stubPhase(RoundPhase.SUBMIT);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.revealResponses(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT_LIVE);
    }

    @Test
    void revealResponsesAfterLockRevealsThem() {
        stubPhase(RoundPhase.LOCKED);
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.revealResponses(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESPONSES);
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
        verify(stateStore, never()).save(any(), any());
    }

    // ── startRound: honour ResultsDisplayMode ────────────────────────────────

    @Test
    void startRoundOpensLiveForImmediateMode() {
        givenSlideWithMode(ResultsDisplayMode.IMMEDIATE);

        orchestrator.startRound(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT_LIVE);
        assertThat(publishedEvent()).isInstanceOf(RoundStarted.class);
    }

    @Test
    void startRoundOpensHiddenForManualMode() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);

        orchestrator.startRound(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.SUBMIT);
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
        when(stateStore.load(SID)).thenReturn(Optional.empty());
    }
}
