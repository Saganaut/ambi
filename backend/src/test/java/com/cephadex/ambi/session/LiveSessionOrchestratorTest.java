package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Supplier;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.dao.DuplicateKeyException;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.LiveResultsShown;
import com.cephadex.ambi.session.event.LiveSessionCancelled;
import com.cephadex.ambi.session.event.LiveSessionEnded;
import com.cephadex.ambi.session.event.LiveSessionStarted;
import com.cephadex.ambi.session.event.ParticipantJoined;
import com.cephadex.ambi.session.event.ParticipantLeft;
import com.cephadex.ambi.session.event.ParticipantReconnected;
import com.cephadex.ambi.session.event.ResponsesRevealed;
import com.cephadex.ambi.session.event.ResultsRevealed;
import com.cephadex.ambi.session.event.RoundStarted;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SubmissionsLocked;
import com.cephadex.ambi.session.event.TallyUpdated;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.session.roundResult.RoundResult;
import com.cephadex.ambi.session.roundResult.RoundResultProjector;

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
    private ParticipantRepository participants;
    private PresenceStore presenceStore;
    private LiveRoundStateStore roundStateStore;
    private TallyStore tallyStore;
    private AnswerStore answerStore;
    private EventPublisher publisher;
    private RoundResultProjector roundResults;
    private LiveSessionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        repo = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        SessionLocks locks = mock(SessionLocks.class);
        roundStateStore = mock(LiveRoundStateStore.class);
        answerStore = mock(AnswerStore.class);
        tallyStore = mock(TallyStore.class);
        presenceStore = mock(PresenceStore.class);
        publisher = mock(EventPublisher.class);
        roundResults = mock(RoundResultProjector.class);

        // Run the locked action inline — both the Runnable and Supplier overloads.
        doAnswer(inv -> {
            ((Runnable) inv.getArgument(1)).run();
            return null;
        }).when(locks).withLock(anyString(), any(Runnable.class));
        when(locks.withLock(anyString(), any(Supplier.class)))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(1)).get());

        orchestrator = new LiveSessionOrchestrator(repo, participants, locks, roundStateStore, answerStore,
                tallyStore, presenceStore, publisher, roundResults);
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
        stubScorableSession();

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.LOCKED);
        // Entered LOCKED -> SubmissionsLocked, which carries no counts (leaks nothing).
        assertThat(publishedEvent()).isInstanceOf(SubmissionsLocked.class);
        // Scored + persisted on close; Redis answers/tally are kept (not cleared).
        verify(roundResults).persist(any(), any(), any());
        verify(answerStore, never()).clear(any(), any());
        verify(tallyStore, never()).clear(any(), any());
    }

    @Test
    void closeFromLiveKeepsResponsesShown() {
        stubPhase(RoundPhase.SUBMIT_LIVE);
        stubScorableSession();
        when(tallyStore.tally(SID, SLIDE)).thenReturn(Map.of("opt-a", 2));

        orchestrator.closeSubmissions(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESPONSES);
        ResponsesRevealed event = (ResponsesRevealed) publishedEvent();
        assertThat(event.optionCounts()).containsEntry("opt-a", 2);
        verify(roundResults).persist(any(), any(), any());
    }

    /** Minimal session stub so the round-close scoring path resolves (empty roster/answers). */
    private void stubScorableSession() {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        Deck deck = mock(Deck.class);
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(repo.findById(SID)).thenReturn(Optional.of(session));
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
        when(session.getId()).thenReturn(SID);
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

    // ── Session lifecycle ────────────────────────────────────────────────────

    @Test
    void createSessionPersistsHostAndSeedsIdleState() {
        Deck deck = mock(Deck.class);
        when(repo.save(any(LiveSession.class))).thenAnswer(inv -> inv.getArgument(0));

        LiveSession session = orchestrator.createSession("user-1", "Host", null, deck);

        verify(participants).save(any(Participant.class));
        verify(repo).save(any(LiveSession.class));
        ArgumentCaptor<LiveRoundState> captor = ArgumentCaptor.forClass(LiveRoundState.class);
        verify(roundStateStore).save(any(), captor.capture());
        assertThat(captor.getValue().publicId()).isEqualTo(session.getPublicId());
    }

    @Test
    void createSessionRetriesOnRoomCodeCollision() {
        Deck deck = mock(Deck.class);
        when(repo.save(any(LiveSession.class)))
                .thenThrow(new DuplicateKeyException("dup"))
                .thenAnswer(inv -> inv.getArgument(0));

        orchestrator.createSession("user-1", "Host", null, deck);

        verify(repo, times(2)).save(any(LiveSession.class));
    }

    @Test
    void beginPlayStartsLobbyAndPublishes() {
        LiveSession session = mock(LiveSession.class);
        when(session.isInLobby()).thenReturn(true);
        when(session.getPublicId()).thenReturn(PUB);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        orchestrator.beginPlay(SID);

        verify(session).start();
        verify(repo).save(session);
        assertThat(publishedEvent()).isInstanceOf(LiveSessionStarted.class);
    }

    @Test
    void beginPlayRejectsWhenNotInLobby() {
        LiveSession session = mock(LiveSession.class);
        when(session.isInLobby()).thenReturn(false);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.beginPlay(SID)).isInstanceOf(ConflictException.class);
        verify(session, never()).start();
    }

    @Test
    void joinAddsParticipantSeedsPresenceAndPublishes() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getRoster()).thenReturn(List.of("host", "p-new"));
        when(repo.findByRoomCode("ROOM")).thenReturn(Optional.of(session));

        LiveSessionOrchestrator.JoinResult result = orchestrator.join("ROOM", "user-9", "Niner", null, null);

        verify(participants).save(any(Participant.class));
        verify(session).addParticipant(result.participant().getParticipantId());
        verify(presenceStore).save(eq(SID), eq(result.participant().getParticipantId()), any());
        assertThat(publishedEvent()).isInstanceOf(ParticipantJoined.class);
    }

    @Test
    void joinUnknownRoomCodeIsNotFound() {
        when(repo.findByRoomCode("NOPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orchestrator.join("NOPE", "u", "n", null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void joinTerminalSessionIsNotFound() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(true);
        when(repo.findByRoomCode("DEAD")).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.join("DEAD", "u", "n", null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void leaveRemovesParticipantAndPublishes() {
        LiveSession session = mock(LiveSession.class);
        when(session.isHost("p-2")).thenReturn(false);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getRoster()).thenReturn(List.of("host"));
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        orchestrator.leave(SID, "p-2");

        verify(session).removeParticipant("p-2");
        verify(presenceStore).remove(SID, "p-2");
        assertThat(publishedEvent()).isInstanceOf(ParticipantLeft.class);
    }

    @Test
    void hostCannotLeave() {
        LiveSession session = mock(LiveSession.class);
        when(session.isHost("host")).thenReturn(true);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.leave(SID, "host")).isInstanceOf(ConflictException.class);
        verify(session, never()).removeParticipant(any());
    }

    @Test
    void endClearsRedisAndPublishesEnded() {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of(slide));
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of("host"));
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(any())).thenReturn(List.of());

        orchestrator.endLiveSession(SID);

        verify(session).endLiveSession();
        verify(roundStateStore).clear(SID);
        verify(presenceStore).clear(SID);
        verify(answerStore).clear(SID, SLIDE);
        verify(tallyStore).clear(SID, SLIDE);
        assertThat(publishedEvent()).isInstanceOf(LiveSessionEnded.class);
    }

    @Test
    void endRejectsTerminalSession() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(true);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.endLiveSession(SID)).isInstanceOf(ConflictException.class);
        verify(session, never()).endLiveSession();
    }

    @Test
    void cancelPublishesCancelled() {
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of());
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getDeck()).thenReturn(deck);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        orchestrator.cancelSession(SID);

        verify(session).cancel();
        assertThat(publishedEvent()).isInstanceOf(LiveSessionCancelled.class);
    }

    // ── revealResults: publish scored result ─────────────────────────────────

    @Test
    void revealResultsPublishesScoredResultWithTerminalFlag() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);
        Slide slide = new Slide();
        slide.setId(SLIDE);
        RoundResult result = RoundResult.compute(SID, slide, List.of(), Instant.now());
        when(roundResults.find(SID, SLIDE)).thenReturn(Optional.of(result));

        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of(slide)); // only slide → last → terminal
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of());
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        orchestrator.revealResults(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        ResultsRevealed event = (ResultsRevealed) publishedEvent();
        assertThat(event.slideId()).isEqualTo(SLIDE);
        assertThat(event.terminal()).isTrue();
    }

    // ── F4 guard: reject opening a second slide while one is open ─────────────

    @Test
    void startRoundRejectsWhenAnotherRoundStillOpen() {
        when(roundStateStore.load(SID)).thenReturn(
                Optional.of(new LiveRoundState(PUB, RoundPhase.SUBMIT, "other-slide", Instant.now())));
        Slide slide = new Slide();
        slide.setId(SLIDE);
        Deck deck = mock(Deck.class);
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.startRound(SID, SLIDE))
                .isInstanceOf(ConflictException.class);
        verify(roundStateStore, never()).save(any(), any());
    }

    // ── Navigation ───────────────────────────────────────────────────────────

    @Test
    void advanceOpensFirstSlideWhenNoneOpen() {
        Slide first = slideWithId("s1");
        Slide second = slideWithId("s2");
        LiveSession session = navigableSession(List.of(first, second));
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo("s1");
        assertThat(publishedEvent()).isInstanceOf(RoundStarted.class);
    }

    @Test
    void advanceReturnsNullWhenSnapshotExhausted() {
        Slide only = slideWithId(SLIDE);
        LiveSession session = navigableSession(List.of(only));
        when(roundStateStore.load(SID)).thenReturn(
                Optional.of(new LiveRoundState(PUB, RoundPhase.REVEAL_RESULTS, SLIDE, Instant.now())));
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThat(orchestrator.advance(SID)).isNull();
        verify(publisher, never()).publish(any(), any());
    }

    private Slide slideWithId(String id) {
        Slide slide = new Slide();
        slide.setId(id);
        return slide;
    }

    private LiveSession navigableSession(List<Slide> slides) {
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(slides);
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        return session;
    }

    // ── Presence & reconnect ─────────────────────────────────────────────────

    @Test
    void reconnectMarksOnlineSavesAndPublishes() {
        Participant participant = Participant.join("user-7", "Seven", null, null);
        participant.markDisconnected();
        when(participants.findById(participant.getParticipantId())).thenReturn(Optional.of(participant));
        LiveSession session = mock(LiveSession.class);
        when(session.hasParticipant(participant.getParticipantId())).thenReturn(true);
        when(session.getPublicId()).thenReturn(PUB);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        Participant result = orchestrator.reconnect(SID, participant.getParticipantId());

        assertThat(result.getConnectionStatus()).isEqualTo(ConnectionStatus.ONLINE);
        verify(participants).save(participant);
        verify(presenceStore).save(eq(SID), eq(participant.getParticipantId()), any());
        assertThat(publishedEvent()).isInstanceOf(ParticipantReconnected.class);
    }

    @Test
    void reconnectRejectsNonMember() {
        Participant participant = Participant.join("user-7", "Seven", null, null);
        when(participants.findById(participant.getParticipantId())).thenReturn(Optional.of(participant));
        LiveSession session = mock(LiveSession.class);
        when(session.hasParticipant(any())).thenReturn(false);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.reconnect(SID, participant.getParticipantId()))
                .isInstanceOf(ForbiddenException.class);
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void heartbeatDebouncesWithinWindow() {
        when(presenceStore.find(SID, "p-1")).thenReturn(Optional.of(Presence.online(Instant.now())));

        orchestrator.heartbeat(SID, "p-1");

        verify(presenceStore, never()).save(any(), any(), any());
    }

    @Test
    void heartbeatSavesWhenPresenceIsStale() {
        when(presenceStore.find(SID, "p-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.ONLINE, Instant.now().minusSeconds(5))));

        orchestrator.heartbeat(SID, "p-1");

        verify(presenceStore).save(eq(SID), eq("p-1"), any());
    }
}
