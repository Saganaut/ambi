package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
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
import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;
import org.springframework.dao.DuplicateKeyException;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.media.storage.ImageUrlResolver;
import com.cephadex.ambi.media.storage.MediaProperties;
import com.cephadex.ambi.media.storage.MediaStorageException;
import com.cephadex.ambi.media.storage.OpaqueImageUrls;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.presentation.slide.enums.Tool;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.FollowUpAnswer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.LiveResultsShown;
import com.cephadex.ambi.session.event.LiveSessionCancelled;
import com.cephadex.ambi.session.event.LiveSessionEnded;
import com.cephadex.ambi.session.event.LiveSessionStarted;
import com.cephadex.ambi.session.event.ParticipantJoined;
import com.cephadex.ambi.session.event.ParticipantLeft;
import com.cephadex.ambi.session.event.ParticipantReconnected;
import com.cephadex.ambi.session.event.PresenceChanged;
import com.cephadex.ambi.session.event.QAndAUpdated;
import com.cephadex.ambi.session.event.ResponsesRevealed;
import com.cephadex.ambi.session.event.ResultsRevealed;
import com.cephadex.ambi.session.event.RoundStarted;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SubmissionsLocked;
import com.cephadex.ambi.session.event.TallyUpdated;
import com.cephadex.ambi.session.event.TimerPaused;
import com.cephadex.ambi.session.event.TimerResumed;
import com.cephadex.ambi.session.event.VoteCast;
import com.cephadex.ambi.session.event.VotingOpened;
import com.cephadex.ambi.session.event.dto.PlaceTargetView;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.DeadlineStore;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.QAndAHostAnswerStore;
import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.redis.SessionDeadline;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionRedisProperties;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.session.redis.VoteOption;
import com.cephadex.ambi.session.redis.VoteStore;
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
    /** The parent of the follow-up pair the follow-up tests navigate. */
    private static final String PARENT = "parent-1";
    /** The follow-up attached to {@link #PARENT}. */
    private static final String CHILD = "child-1";
    /** Origin the opaque image URLs under test are minted absolute against. */
    private static final String BACKEND_ORIGIN = "http://localhost:8080";

    private LiveSessionRepository repo;
    private ParticipantRepository participants;
    private PresenceStore presenceStore;
    private LiveRoundStateStore roundStateStore;
    private TallyStore tallyStore;
    private AnswerStore answerStore;
    private VoteStore voteStore;
    private QAndAHostAnswerStore qandaHostAnswers;
    private FollowUpOptionStore followUpOptions;
    private EventPublisher publisher;
    private RoundResultProjector roundResults;
    private ImageUrlResolver imageUrls;
    private OpaqueImageUrls opaqueImageUrls;
    private S3StorageService storage;
    private RedisJsonCodec codec;
    private DeadlineStore deadlines;
    private LiveSessionOrchestrator orchestrator;

    @BeforeEach
    void setUp() {
        repo = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        SessionLocks locks = mock(SessionLocks.class);
        roundStateStore = mock(LiveRoundStateStore.class);
        answerStore = mock(AnswerStore.class);
        tallyStore = mock(TallyStore.class);
        voteStore = mock(VoteStore.class);
        presenceStore = mock(PresenceStore.class);
        qandaHostAnswers = mock(QAndAHostAnswerStore.class);
        followUpOptions = mock(FollowUpOptionStore.class);
        // The real store reports an empty set for a round with no snapshot, never
        // null — a bare mock would hand back null and mask that contract.
        when(followUpOptions.load(anyString(), anyString())).thenReturn(FollowUpOptionSet.empty());
        publisher = mock(EventPublisher.class);
        roundResults = mock(RoundResultProjector.class);
        imageUrls = mock(ImageUrlResolver.class);
        // Real, not mocked: the follow-up board's candidate URLs must be asserted
        // as the wire sees them (see followUpCandidateImageUrlsAreOpaque).
        MediaProperties mediaProps = new MediaProperties();
        mediaProps.setOpaqueTokenSecret("test-only-opaque-image-secret-of-sufficient-length");
        mediaProps.setPublicBaseUrl(BACKEND_ORIGIN);
        opaqueImageUrls = new OpaqueImageUrls(mediaProps);
        storage = mock(S3StorageService.class);
        codec = mock(RedisJsonCodec.class);
        deadlines = mock(DeadlineStore.class);

        // Run the locked action inline — both the Runnable and Supplier overloads.
        doAnswer(inv -> {
            ((Runnable) inv.getArgument(1)).run();
            return null;
        }).when(locks).withLock(anyString(), any(Runnable.class));
        when(locks.withLock(anyString(), ArgumentMatchers.<Supplier<Object>>any()))
                .thenAnswer(inv -> ((Supplier<?>) inv.getArgument(1)).get());

        orchestrator = new LiveSessionOrchestrator(repo, participants, locks, roundStateStore, answerStore,
                tallyStore, voteStore, presenceStore, qandaHostAnswers, followUpOptions, publisher, roundResults,
                imageUrls, opaqueImageUrls, storage, codec, deadlines, new SessionRedisProperties());
    }

    private void stubPhase(RoundPhase phase) {
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(PUB, phase, SLIDE, Instant.now(), null, null, 0L, false)));
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

    @Test
    void revealResponsesRejectsASlideThatIsNotTheCurrentRound() {
        // Already showing responses: the slide-match check runs ahead of the
        // idempotence short-circuit, so a stale call still 409s instead of passing.
        stubPhase(RoundPhase.SUBMIT_LIVE); // current round is SLIDE

        assertThatThrownBy(() -> orchestrator.revealResponses(SID, "other-slide"))
                .isInstanceOf(ConflictException.class);

        // A stale host call must leave the current round untouched: no phase change,
        // no tally read, nothing published.
        verify(roundStateStore, never()).save(any(), any());
        verify(tallyStore, never()).tally(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void revealResponsesRejectsAnIdleSessionWithNoOpenRound() {
        // Idle state carries no currentSlideId — there is no round to show yet.
        when(roundStateStore.load(SID)).thenReturn(Optional.of(LiveRoundState.idle(PUB)));

        assertThatThrownBy(() -> orchestrator.revealResponses(SID, SLIDE))
                .isInstanceOf(ConflictException.class);

        verify(roundStateStore, never()).save(any(), any());
        verify(tallyStore, never()).tally(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    // ── revealResults: reveal (closing an open round first) ──────────────────

    @Test
    void revealResultsFromClosedTransitions() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);
        stubScorableSession();

        orchestrator.revealResults(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        // Already scored at its own close — not re-scored here (score-once).
        verify(roundResults, never()).persist(any(), any(), any());
    }

    @Test
    void revealResultsWhileOpenClosesAndScores() {
        stubPhase(RoundPhase.SUBMIT_LIVE);
        stubScorableSession();

        orchestrator.revealResults(SID, SLIDE);

        // Closes + scores the still-open round in the same step, then reveals.
        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        verify(roundResults).persist(any(), any(), any());
    }

    // ── openVoting / submitVote (best-answer voting, D3) ─────────────────────

    @Test
    void openVotingClosesUnscoredMintsAnonymousOptionsAndCancelsTimer() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(
                answerFrom("p-2", new TextAnswer("a plausible lie"))));

        orchestrator.openVoting(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.VOTE);
        // Scoring waits for the votes — nothing persisted on this transition.
        verify(roundResults, never()).persist(any(), any(), any());
        verify(deadlines).cancel(SessionDeadline.closeRound(SID, SLIDE));

        // The stored mapping keeps the author; the published options don't.
        ArgumentCaptor<Map<String, VoteOption>> stored = ArgumentCaptor.captor();
        verify(voteStore).saveOptions(eq(SID), eq(SLIDE), stored.capture());
        assertThat(stored.getValue().values())
                .singleElement()
                .isEqualTo(new VoteOption("p-2", "a plausible lie", null));
        VotingOpened event = (VotingOpened) publishedEvent();
        assertThat(event.options()).singleElement().satisfies(option -> {
            assertThat(option.text()).isEqualTo("a plausible lie");
            assertThat(option.optionId()).isNotEqualTo("p-2");
        });
    }

    @Test
    void openVotingIsIdempotentWhileVoting() {
        stubPhase(RoundPhase.VOTE);

        orchestrator.openVoting(SID, SLIDE);

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void openVotingAfterCloseIsRejectedBecauseTheRoundIsScored() {
        stubPhase(RoundPhase.LOCKED);

        assertThatThrownBy(() -> orchestrator.openVoting(SID, SLIDE))
                .isInstanceOf(ConflictException.class);
        verify(roundStateStore, never()).save(any(), any());
    }

    @Test
    void openVotingWithoutVotableSubmissionsIsRejected() {
        stubPhase(RoundPhase.SUBMIT);
        // An MCQ pick isn't votable — there is nothing creative to judge.
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(
                answerFrom("p-2", new McqAnswer(Set.of("opt-a")))));

        assertThatThrownBy(() -> orchestrator.openVoting(SID, SLIDE))
                .isInstanceOf(ConflictException.class);
        verify(roundStateStore, never()).save(any(), any());
        verify(voteStore, never()).saveOptions(any(), any(), any());
    }

    @Test
    void openVotingOnAFollowUpRoundIsRejected() {
        stubPhase(RoundPhase.SUBMIT);
        // A follow-up pick already IS that round's answer, so it is not votable:
        // the VOTE phase must never open on top of a follow-up board.
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(
                answerFrom("p-2", new FollowUpAnswer("opt-a"))));

        assertThatThrownBy(() -> orchestrator.openVoting(SID, SLIDE))
                .isInstanceOf(ConflictException.class);
        verify(roundStateStore, never()).save(any(), any());
        verify(voteStore, never()).saveOptions(any(), any(), any());
    }

    @Test
    void submitVoteResolvesTheOptionAndPublishesOnlyTheCount() {
        stubPhase(RoundPhase.VOTE);
        when(voteStore.options(SID, SLIDE))
                .thenReturn(Map.of("opt-1", new VoteOption("p-2", "a plausible lie", null)));
        when(voteStore.count(SID, SLIDE)).thenReturn(1L);

        orchestrator.submitVote(SID, SLIDE, "p-1", "opt-1");

        verify(voteStore).castVote(SID, SLIDE, "p-1", "opt-1");
        VoteCast event = (VoteCast) publishedEvent();
        assertThat(event.votesCast()).isEqualTo(1);
    }

    @Test
    void submitVoteOutsideTheVotePhaseIsRejected() {
        stubPhase(RoundPhase.SUBMIT);

        assertThatThrownBy(() -> orchestrator.submitVote(SID, SLIDE, "p-1", "opt-1"))
                .isInstanceOf(ConflictException.class);
        verify(voteStore, never()).castVote(any(), any(), any(), any());
    }

    @Test
    void submitVoteForOwnAnswerIsRejected() {
        stubPhase(RoundPhase.VOTE);
        when(voteStore.options(SID, SLIDE))
                .thenReturn(Map.of("opt-1", new VoteOption("p-1", "my own lie", null)));

        assertThatThrownBy(() -> orchestrator.submitVote(SID, SLIDE, "p-1", "opt-1"))
                .isInstanceOf(ConflictException.class);
        verify(voteStore, never()).castVote(any(), any(), any(), any());
    }

    @Test
    void submitVoteForUnknownOptionIsRejected() {
        stubPhase(RoundPhase.VOTE);
        when(voteStore.options(SID, SLIDE)).thenReturn(Map.of());

        assertThatThrownBy(() -> orchestrator.submitVote(SID, SLIDE, "p-1", "opt-x"))
                .isInstanceOf(NotFoundException.class);
        verify(voteStore, never()).castVote(any(), any(), any(), any());
    }

    @Test
    void revealResultsFromVoteScoresTheDeferredRound() {
        stubPhase(RoundPhase.VOTE);
        stubScorableSession();
        when(voteStore.options(SID, SLIDE))
                .thenReturn(Map.of("opt-1", new VoteOption("p-2", "a plausible lie", null)));
        when(voteStore.votes(SID, SLIDE)).thenReturn(Map.of("p-1", "opt-1"));

        orchestrator.revealResults(SID, SLIDE);

        // VOTE is closed but unscored — the reveal transition scores it, votes in hand.
        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        verify(roundResults).persist(any(), any(), any());
    }

    @Test
    void openingAnotherSlideWhileVotingIsRejected() {
        stubPhase(RoundPhase.VOTE);
        Slide other = new Slide();
        other.setId("slide-2");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-2")).thenReturn(Optional.of(other));
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        // The votes are unscored until the reveal — jumping away would drop them.
        assertThatThrownBy(() -> orchestrator.startRound(SID, "slide-2"))
                .isInstanceOf(ConflictException.class);
    }

    private static Answer answerFrom(String participantId, AnswerPayload payload) {
        Answer a = answerWith(payload);
        a.setParticipantId(participantId);
        return a;
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

    @Test
    void openClearsAnswersTogetherWithTheTally() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);

        orchestrator.startRound(SID, SLIDE);

        // A reopen must never leave prior answers beside an emptied tally: the
        // resubmit reconciliation would decrement missing hash fields and
        // publish zero/negative counts, so no heat renders.
        verify(tallyStore).clear(SID, SLIDE);
        verify(voteStore).clear(SID, SLIDE);
        verify(answerStore).clear(SID, SLIDE);
        verify(qandaHostAnswers).clear(SID, SLIDE);
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

    @Test
    void drawingResubmitDeletesTheReplacedUploadAfterTheWrite() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1"))
                .thenReturn(Optional.of(answerWith(new DrawingAnswer(drawingImage("drawing/s/p/old/original")))));

        orchestrator.submitAnswer(SID, SLIDE, "p-1",
                new DrawingAnswer(drawingImage("drawing/s/p/new/original")), 0);

        // Delete strictly AFTER the overwrite lands: a rejected submit must
        // never strand the still-current answer pointing at dead objects.
        InOrder inOrder = inOrder(answerStore, storage);
        inOrder.verify(answerStore).submit(eq(SID), eq(SLIDE), any(Answer.class));
        inOrder.verify(storage).delete(anyCollection());
    }

    @Test
    void drawingResubmitSurvivesAFailedCleanupDelete() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1"))
                .thenReturn(Optional.of(answerWith(new DrawingAnswer(drawingImage("drawing/s/p/old/original")))));
        doThrow(new MediaStorageException("delete failed", null))
                .when(storage).delete(anyCollection());

        // The overwrite already landed; a failed best-effort cleanup must not
        // turn the successful submit into a 500 (worst case: an orphaned object).
        orchestrator.submitAnswer(SID, SLIDE, "p-1",
                new DrawingAnswer(drawingImage("drawing/s/p/new/original")), 0);

        verify(answerStore).submit(eq(SID), eq(SLIDE), any(Answer.class));
    }

    @Test
    void drawingResubmitOfTheSameImageDeletesNothing() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1"))
                .thenReturn(Optional.of(answerWith(new DrawingAnswer(drawingImage("drawing/s/p/same/original")))));

        orchestrator.submitAnswer(SID, SLIDE, "p-1",
                new DrawingAnswer(drawingImage("drawing/s/p/same/original")), 0);

        verify(answerStore).submit(eq(SID), eq(SLIDE), any(Answer.class));
        verify(storage, never()).delete(anyCollection());
    }

    @Test
    void drawingSubmitToClosedRoundDeletesNothing() {
        stubPhase(RoundPhase.LOCKED);

        assertThatThrownBy(() -> orchestrator.submitAnswer(SID, SLIDE, "p-1",
                new DrawingAnswer(drawingImage("drawing/s/p/new/original")), 0))
                .isInstanceOf(ConflictException.class);
        verify(storage, never()).delete(anyCollection());
    }

    /** An internal (S3-backed) AppImage with the given source key. */
    private static AppImage drawingImage(String srcKey) {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey(srcKey);
        return image;
    }

    private static Answer answerWith(AnswerPayload payload) {
        Answer a = new Answer();
        a.setParticipantId("p-1");
        a.setSessionId(SID);
        a.setSlideId(SLIDE);
        a.setSubmittedAt(Instant.now());
        a.setPayload(payload);
        return a;
    }

    // ── submitQuestion / answerQuestion (Q&A) ────────────────────────────────

    @Test
    void submitQuestionAppendsToPriorAggregateAndPublishes() {
        stubPhase(RoundPhase.SUBMIT);
        QAndAQuestions prior = new QAndAQuestions(
                List.of(new QAndAQuestions.QuestionEntry("q-1", "First?", Instant.now())));
        Answer priorAnswer = answerWith(prior);
        when(answerStore.answerOf(SID, SLIDE, "p-1")).thenReturn(Optional.of(priorAnswer));
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(priorAnswer));
        when(qandaHostAnswers.all(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.submitQuestion(SID, SLIDE, "p-1", new QAndAAnswer("  Second?  "), null, false);

        ArgumentCaptor<Answer> stored = ArgumentCaptor.forClass(Answer.class);
        verify(answerStore).submit(eq(SID), eq(SLIDE), stored.capture());
        QAndAQuestions aggregate = (QAndAQuestions) stored.getValue().getPayload();
        assertThat(aggregate.questions()).hasSize(2);
        assertThat(aggregate.questions().get(0).id()).isEqualTo("q-1");
        assertThat(aggregate.questions().get(1).text()).isEqualTo("Second?");
        assertThat(aggregate.questions().get(1).id()).isNotBlank();
        // Never touches the option tally — Q&A has no per-option histogram.
        verify(tallyStore, never()).increment(any(), any(), any());
        assertThat(publishedEvent()).isInstanceOf(QAndAUpdated.class);
    }

    @Test
    void submitQuestionEnforcesPerParticipantCap() {
        stubPhase(RoundPhase.SUBMIT);
        QAndAQuestions prior = new QAndAQuestions(List.of(
                new QAndAQuestions.QuestionEntry("q-1", "One?", Instant.now()),
                new QAndAQuestions.QuestionEntry("q-2", "Two?", Instant.now())));
        when(answerStore.answerOf(SID, SLIDE, "p-1")).thenReturn(Optional.of(answerWith(prior)));

        assertThatThrownBy(() -> orchestrator.submitQuestion(SID, SLIDE, "p-1", new QAndAAnswer("Three?"), 2, false))
                .isInstanceOf(ConflictException.class);
        verify(answerStore, never()).submit(any(), any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void submitQuestionToClosedRoundIsRejected() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);

        assertThatThrownBy(() -> orchestrator.submitQuestion(SID, SLIDE, "p-1", new QAndAAnswer("Late?"), null, false))
                .isInstanceOf(ConflictException.class);
        verify(answerStore, never()).submit(any(), any(), any());
    }

    @Test
    void submitQuestionAnonymizedPublishesWithoutParticipantIds() {
        stubPhase(RoundPhase.SUBMIT);
        when(answerStore.answerOf(SID, SLIDE, "p-1")).thenReturn(Optional.empty());
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(answerWith(new QAndAQuestions(
                List.of(new QAndAQuestions.QuestionEntry("q-1", "Who asked?", Instant.now()))))));
        when(qandaHostAnswers.all(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.submitQuestion(SID, SLIDE, "p-1", new QAndAAnswer("Who asked?"), null, true);

        QAndAUpdated event = (QAndAUpdated) publishedEvent();
        assertThat(event.questions()).isNotEmpty();
        assertThat(event.questions()).allSatisfy(q -> assertThat(q.participantId()).isNull());
    }

    @Test
    void answerQuestionStoresHostAnswerAndPublishes() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);
        Answer asked = answerWith(new QAndAQuestions(
                List.of(new QAndAQuestions.QuestionEntry("q-1", "Why?", Instant.now()))));
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(asked));
        when(qandaHostAnswers.all(SID, SLIDE)).thenReturn(Map.of("q-1", "Because."));

        orchestrator.answerQuestion(SID, SLIDE, "q-1", "Because.");

        verify(qandaHostAnswers).put(SID, SLIDE, "q-1", "Because.");
        QAndAUpdated event = (QAndAUpdated) publishedEvent();
        assertThat(event.questions()).singleElement()
                .satisfies(q -> assertThat(q.hostAnswer()).isEqualTo("Because."));
    }

    @Test
    void answerQuestionWithBlankTextClearsIt() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);
        Answer asked = answerWith(new QAndAQuestions(
                List.of(new QAndAQuestions.QuestionEntry("q-1", "Why?", Instant.now()))));
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(asked));
        when(qandaHostAnswers.all(SID, SLIDE)).thenReturn(Map.of());

        orchestrator.answerQuestion(SID, SLIDE, "q-1", "  ");

        verify(qandaHostAnswers).remove(SID, SLIDE, "q-1");
        verify(qandaHostAnswers, never()).put(any(), any(), any(), any());
        assertThat(publishedEvent()).isInstanceOf(QAndAUpdated.class);
    }

    @Test
    void answerQuestionForUnknownQuestionIsNotFound() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of());

        assertThatThrownBy(() -> orchestrator.answerQuestion(SID, SLIDE, "q-missing", "Because."))
                .isInstanceOf(NotFoundException.class);
        verify(qandaHostAnswers, never()).put(any(), any(), any(), any());
        verify(publisher, never()).publish(any(), any());
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
    void createSessionSurvivesSnapshotSizingFailure() {
        Deck deck = mock(Deck.class);
        when(repo.save(any(LiveSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(codec.serialize(deck)).thenThrow(new RuntimeException("unserializable"));

        LiveSession session = orchestrator.createSession("user-1", "Host", null, deck);

        assertThat(session).isNotNull();
        verify(repo).save(any(LiveSession.class));
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
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        LiveSessionOrchestrator.JoinResult result = orchestrator.join("ROOM", "user-9", "Niner", null, null);

        verify(participants).save(any(Participant.class));
        verify(session).addParticipant(result.participant().getParticipantId());
        verify(presenceStore).save(eq(SID), eq(result.participant().getParticipantId()), any());
        assertThat(publishedEvent()).isInstanceOf(ParticipantJoined.class);
    }

    @Test
    void joinRejectsWhenRosterAtDeckCap() {
        Deck deck = mock(Deck.class);
        when(deck.getSettings()).thenReturn(new Settings.DeckSettings(null, null,
                new Settings.AudienceSettings(2, false, false, false, false, false, true), null));
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SID);
        when(session.getDeck()).thenReturn(deck);
        when(session.participantCount()).thenReturn(2);
        when(repo.findByRoomCode("ROOM")).thenReturn(Optional.of(session));
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("participant limit");
        verify(participants, never()).save(any(Participant.class));
        verify(session, never()).addParticipant(anyString());
    }

    @Test
    void joinAppliesDefaultCapWhenDeckHasNoAudienceSettings() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SID);
        when(session.participantCount()).thenReturn(200);
        when(repo.findByRoomCode("ROOM")).thenReturn(Optional.of(session));
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> orchestrator.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOf(ConflictException.class);
        verify(session, never()).addParticipant(anyString());
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
        // Not a drawing round → no gallery payload; not a place-on-image round →
        // no correct-location circles.
        assertThat(event.drawings()).isNull();
        assertThat(event.placeTargets()).isNull();
    }

    @Test
    void revealResultsCarriesDrawingGalleryForDrawingRound() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);
        Slide slide = slideWithId(SLIDE);
        slide.setContent(new DrawingContent(null, PromptPlacement.ALONGSIDE, null,
                List.of("#111111"), Set.of(Tool.PEN)));
        RoundResult result = RoundResult.compute(SID, slide, List.of(), Instant.now());
        when(roundResults.find(SID, SLIDE)).thenReturn(Optional.of(result));

        Participant artist = Participant.join("user-1", "Artist One", null, null);
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of(slide));
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        LiveSession session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of(artist.getParticipantId()));
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(List.of(artist.getParticipantId()))).thenReturn(List.of(artist));

        AppImage stored = new AppImage();
        stored.setExternal(false);
        stored.setSrcKey("drawing/" + SID + "/abc/original");
        Answer answer = new Answer();
        answer.setParticipantId(artist.getParticipantId());
        answer.setPayload(new DrawingAnswer(stored));
        when(answerStore.answers(SID, SLIDE)).thenReturn(List.of(answer));
        when(imageUrls.displayUrl(eq(stored), any())).thenReturn("https://s3/presigned-drawing");

        orchestrator.revealResults(SID, SLIDE);

        ResultsRevealed event = (ResultsRevealed) publishedEvent();
        assertThat(event.drawings()).hasSize(1);
        assertThat(event.drawings().get(0).participantId()).isEqualTo(artist.getParticipantId());
        assertThat(event.drawings().get(0).displayName()).isEqualTo("Artist One");
        assertThat(event.drawings().get(0).imageUrl()).isEqualTo("https://s3/presigned-drawing");
    }

    @Test
    void revealResultsCarriesCorrectTargetsForPlaceOnImageRound() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);
        Slide slide = slideWithId(SLIDE);
        slide.setContent(new PlaceOnImageContent(
                null,
                List.of(new PlaceItem("t-1", "Capital", null, "#00aa00")),
                Map.of("t-1", new PlacePoint(0.25, 0.75)),
                0.08,
                ScoreMode.INSIDE_RADIUS));
        RoundResult result = RoundResult.compute(SID, slide, List.of(), Instant.now());
        when(roundResults.find(SID, SLIDE)).thenReturn(Optional.of(result));

        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of(slide));
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        LiveSession session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of());
        when(repo.findById(SID)).thenReturn(Optional.of(session));

        orchestrator.revealResults(SID, SLIDE);

        ResultsRevealed event = (ResultsRevealed) publishedEvent();
        // The correct-location circles ride the reveal so the board can draw them:
        // geometry keyed by item id, with the slide tolerance as the radius.
        assertThat(event.placeTargets()).singleElement()
                .satisfies(target -> {
                    assertThat(target.itemId()).isEqualTo("t-1");
                    assertThat(target.x()).isEqualTo(0.25);
                    assertThat(target.y()).isEqualTo(0.75);
                    assertThat(target.radius()).isEqualTo(0.08);
                });
        // Not a drawing round → no gallery payload.
        assertThat(event.drawings()).isNull();
    }

    @Test
    void placeTargetViewsFollowAuthoredItemOrderAndSkipUnkeyedItems() {
        PlaceOnImageContent content = new PlaceOnImageContent(
                null,
                List.of(new PlaceItem("t-1", "One", null, null),
                        new PlaceItem("t-2", "Two", null, null),
                        new PlaceItem("t-3", "Three", null, null)),
                Map.of("t-3", new PlacePoint(0.3, 0.3),
                        "t-1", new PlacePoint(0.1, 0.1),
                        "gone", new PlacePoint(0.9, 0.9)),
                0.05,
                ScoreMode.INSIDE_RADIUS);

        // Bank order rather than key order: the unkeyed "t-2" simply has no
        // circle, and the stale key naming no item is dropped.
        assertThat(PlaceTargetView.from(content))
                .extracting(target -> target.itemId())
                .containsExactly("t-1", "t-3");
    }

    @Test
    void revealResultsRejectsASlideThatIsNotTheCurrentRound() {
        stubPhase(RoundPhase.REVEAL_RESPONSES); // current round is SLIDE

        assertThatThrownBy(() -> orchestrator.revealResults(SID, "other-slide"))
                .isInstanceOf(ConflictException.class);

        // A stale host call must leave the current round untouched: no phase change,
        // no consumed timer, no scoring, nothing published.
        verify(roundStateStore, never()).save(any(), any());
        verify(deadlines, never()).cancel(any());
        verify(roundResults, never()).persist(any(), any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void revealResultsWithoutAPersistedRecordStillPublishesTheTransition() {
        stubPhase(RoundPhase.REVEAL_RESPONSES);
        // Store drift: the round closed, but no RoundResult was ever persisted.
        when(roundResults.find(SID, SLIDE)).thenReturn(Optional.empty());

        Participant player = Participant.join("user-1", "Player One", null, null);
        Slide slide = slideWithId(SLIDE);
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of(slide)); // only slide → last → terminal
        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getRoster()).thenReturn(List.of(player.getParticipantId()));
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(List.of(player.getParticipantId()))).thenReturn(List.of(player));

        orchestrator.revealResults(SID, SLIDE);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        // No record to reveal, but the phase moved — the event carries the transition.
        ResultsRevealed event = (ResultsRevealed) publishedEvent();
        assertThat(event.slideId()).isEqualTo(SLIDE);
        assertThat(event.outcomes()).isEmpty();
        assertThat(event.optionCounts()).isEmpty();
        assertThat(event.correctOption()).isNull();
        assertThat(event.drawings()).isNull();
        assertThat(event.placeTargets()).isNull();
        assertThat(event.terminal()).isTrue();
        assertThat(event.scoreboard()).singleElement()
                .satisfies(entry -> {
                    assertThat(entry.participantId()).isEqualTo(player.getParticipantId());
                    assertThat(entry.displayName()).isEqualTo("Player One");
                });
    }

    // ── F4 guard: reject opening a second slide while one is open ─────────────

    @Test
    void startRoundRejectsWhenAnotherRoundStillOpen() {
        when(roundStateStore.load(SID)).thenReturn(
                Optional.of(new LiveRoundState(PUB, RoundPhase.SUBMIT, "other-slide", Instant.now(), null, null, 0L, false)));
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

    // ── Follow-up rounds (B3) ────────────────────────────────────────────────

    /**
     * A TEXT parent linked to its follow-up. Built on a <em>real</em> {@link Deck}
     * (the sibling fixtures mock it) so the parent/child link is validated exactly
     * as it is at runtime — both back-pointers plus {@code FollowUpContent} — and
     * the snapshot order is the authored one.
     */
    private LiveSession followUpSession(String... trailingSlideIds) {
        return followUpSession(FollowUpMode.BEST_ANSWER_VOTE, Set.of(), trailingSlideIds);
    }

    /**
     * The same pair on a given child mode and parent answer key — what
     * {@code SPOT_THE_ANSWER} needs, since its mint seeds that key into the board.
     */
    private LiveSession followUpSession(FollowUpMode mode, Set<String> acceptedAnswers,
            String... trailingSlideIds) {
        Slide parent = slideWithId(PARENT);
        parent.setSortOrder("a");
        parent.setContent(new TextContent(acceptedAnswers, MatchMode.EXACT, false, true, null));
        parent.setChildId(CHILD);
        Slide child = slideWithId(CHILD);
        child.setSortOrder("b");
        child.setContent(new FollowUpContent(mode));
        child.setParentId(PARENT);

        Deck deck = new Deck();
        deck.addSlide(parent);
        deck.addSlide(child);
        char rank = 'c';
        for (String id : trailingSlideIds) {
            Slide trailing = slideWithId(id);
            trailing.setSortOrder(String.valueOf(rank++));
            deck.addSlide(trailing);
        }

        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        return session;
    }

    /** One drawing submitted to the parent round, at the same fixed instant. */
    private static Answer parentDrawingAnswer(String participantId, AppImage image) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(SID);
        answer.setSlideId(PARENT);
        answer.setSubmittedAt(Instant.parse("2026-01-01T00:00:00Z"));
        answer.setPayload(new DrawingAnswer(image));
        return answer;
    }

    /** One submission of the parent round, at a fixed instant so minting is deterministic. */
    private static Answer parentAnswer(String participantId, String text) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(SID);
        answer.setSlideId(PARENT);
        answer.setSubmittedAt(Instant.parse("2026-01-01T00:00:00Z"));
        answer.setPayload(new TextAnswer(text));
        return answer;
    }

    private FollowUpOptionSet savedCandidates(String slideId) {
        ArgumentCaptor<FollowUpOptionSet> captor = ArgumentCaptor.forClass(FollowUpOptionSet.class);
        verify(followUpOptions).save(eq(SID), eq(slideId), captor.capture());
        return captor.getValue();
    }

    /** The parent round is scored, so its follow-up is playable. */
    private void stubScoredParent() {
        Slide parent = slideWithId(PARENT);
        when(roundResults.find(SID, PARENT))
                .thenReturn(Optional.of(RoundResult.compute(SID, parent, List.of(), Instant.now())));
    }

    /**
     * The same pair with a DRAWING parent — the one parent kind whose candidates
     * carry an image, so the only fixture that exercises the candidate image-URL
     * resolution.
     */
    private void drawingFollowUpSession() {
        drawingFollowUpSession(FollowUpMode.BEST_ANSWER_VOTE, null);
    }

    /**
     * The same pair on a given child mode and authored answer image — what
     * {@code SPOT_THE_ANSWER} needs on an image parent, since its mint seeds
     * that picture onto the board.
     *
     * @param trailingSlideIds slides after the pair, for the navigation cases
     */
    private void drawingFollowUpSession(FollowUpMode mode, AppImage correctImage,
            String... trailingSlideIds) {
        Slide parent = slideWithId(PARENT);
        parent.setSortOrder("a");
        parent.setContent(new DrawingContent(null, PromptPlacement.ALONGSIDE, correctImage,
                List.of("#111111"), Set.of(Tool.PEN)));
        parent.setChildId(CHILD);
        Slide child = slideWithId(CHILD);
        child.setSortOrder("b");
        child.setContent(new FollowUpContent(mode));
        child.setParentId(PARENT);

        Deck deck = new Deck();
        deck.addSlide(parent);
        deck.addSlide(child);
        char rank = 'c';
        for (String id : trailingSlideIds) {
            Slide trailing = slideWithId(id);
            trailing.setSortOrder(String.valueOf(rank++));
            deck.addSlide(trailing);
        }

        LiveSession session = mock(LiveSession.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(repo.findById(SID)).thenReturn(Optional.of(session));
    }

    /** The author's own answer picture: a stored gallery object, as the editor sets it. */
    private static AppImage authoredAnswerImage() {
        AppImage image = new AppImage();
        image.setExternal(false);
        image.setSrcKey("gallery/answer/original");
        return image;
    }

    @Test
    void followUpCandidateImageUrlsAreOpaque() {
        drawingFollowUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        AppImage submitted = new AppImage();
        submitted.setExternal(false);
        submitted.setSrcKey("drawing/" + SID + "/p-1/original");
        Answer answer = new Answer();
        answer.setParticipantId("p-1");
        answer.setSessionId(SID);
        answer.setSlideId(PARENT);
        answer.setSubmittedAt(Instant.parse("2026-01-01T00:00:00Z"));
        answer.setPayload(new DrawingAnswer(submitted));
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(answer));
        when(imageUrls.displayKey(eq(submitted), any())).thenReturn("drawing/" + SID + "/p-1/lg.webp");

        orchestrator.startRound(SID, CHILD);

        String imageUrl = savedCandidates(CHILD).options().get(0).imageUrl();
        // The candidate is served through our own proxy behind a signed token —
        // a presigned S3 URL would name the key namespace it came from, which is
        // exactly what a SPOT_THE_ANSWER board must not let a client read.
        assertThat(imageUrl).startsWith(BACKEND_ORIGIN + "/api/media/opaque-image?t=");
        assertThat(imageUrl).doesNotContain("drawing/").doesNotContain("gallery/");
        // The key still round-trips server-side, so the proxy can serve the bytes.
        assertThat(opaqueImageUrls.keyFrom(imageUrl.substring(imageUrl.indexOf("?t=") + 3)))
                .isEqualTo("drawing/" + SID + "/p-1/lg.webp");
        // Nothing presigns on this path any more (a 1h URL would die inside the
        // 6h snapshot it is frozen into).
        verify(imageUrls, never()).displayUrl(eq(submitted), any());
    }

    @Test
    void openingAFollowUpSnapshotsTheCandidatesMintedFromTheParentRound() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Paris")));

        orchestrator.startRound(SID, CHILD);

        assertThat(savedCandidates(CHILD).options()).singleElement().satisfies(option -> {
            assertThat(option.text()).isEqualTo("Paris");
            assertThat(option.authorParticipantIds()).containsExactly("p-1");
        });
        // The board must exist before the round is announced: the snapshot is
        // written ahead of the publish, never after it.
        InOrder inOrder = inOrder(followUpOptions, publisher);
        inOrder.verify(followUpOptions).clear(SID, CHILD);
        inOrder.verify(followUpOptions).save(eq(SID), eq(CHILD), any());
        inOrder.verify(publisher).publish(eq(PUB), any());
    }

    @Test
    void followUpRoundStartedCarriesTheSavedBoardRatherThanAFreshMint() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Paris")));
        // The event reads the snapshot back, so a store holding something other
        // than what this open would mint proves the read, not a re-mint.
        when(followUpOptions.load(SID, CHILD)).thenReturn(new FollowUpOptionSet(List.of(
                new FollowUpOption("cand-saved", "Berlin", null, Set.of("p-9"), false))));

        orchestrator.startRound(SID, CHILD);

        RoundStarted event = (RoundStarted) publishedEvent();
        assertThat(event.slide().followUp()).isNotNull();
        assertThat(event.slide().followUp().mode()).isEqualTo(FollowUpMode.BEST_ANSWER_VOTE);
        assertThat(event.slide().followUp().parentSlideId()).isEqualTo(PARENT);
        assertThat(event.slide().followUp().options()).extracting("optionId").containsExactly("cand-saved");
        assertThat(event.slide().hasFollowUp()).isFalse();
    }

    @Test
    void aParentRoundIsAnnouncedAsHavingAFollowUp() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        orchestrator.startRound(SID, PARENT);

        // The host bar reads this to drop "Reveal answers" and advance into the child.
        RoundStarted event = (RoundStarted) publishedEvent();
        assertThat(event.slide().hasFollowUp()).isTrue();
        assertThat(event.slide().followUp()).isNull();
    }

    @Test
    void openingAFollowUpFallsBackToTheDurableParentAnswersWhenRedisIsEmpty() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        // The parent's Redis answers aged out under the session TTL; the flushed
        // Mongo copy is what the candidates are minted from.
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of(parentAnswer("p-2", "Berlin")));

        orchestrator.startRound(SID, CHILD);

        assertThat(savedCandidates(CHILD).options()).singleElement()
                .satisfies(option -> assertThat(option.text()).isEqualTo("Berlin"));
    }

    @Test
    void openingAParentClearsItsFollowUpChildsRoundState() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        orchestrator.startRound(SID, PARENT);

        // Replaying a parent replays the pair: the child's stale board must not
        // stay addressable behind the re-run parent.
        verify(answerStore).clear(SID, CHILD);
        verify(tallyStore).clear(SID, CHILD);
        verify(voteStore).clear(SID, CHILD);
        verify(followUpOptions).clear(SID, CHILD);
        // The parent is not itself a follow-up — nothing is minted for it.
        verify(followUpOptions, never()).save(any(), any(), any());
    }

    @Test
    void revealResultsOnAParentWithAFollowUpIsBlocked() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        assertThatThrownBy(() -> orchestrator.revealResults(SID, PARENT))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getCode())
                        .isEqualTo("REVEAL_BLOCKED_BY_FOLLOW_UP"));

        // Rejected before any write: the parent's results are the follow-up's to
        // present, so the round is left exactly where it was.
        verify(roundStateStore, never()).save(any(), any());
        verify(roundResults, never()).persist(any(), any(), any());
        verify(deadlines, never()).cancel(any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void revealResultsOnTheFollowUpItselfSucceeds() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, CHILD, Instant.now(), null, null, 0L, false)));
        Slide child = slideWithId(CHILD);
        when(roundResults.find(SID, CHILD))
                .thenReturn(Optional.of(RoundResult.compute(SID, child, List.of(), Instant.now())));

        orchestrator.revealResults(SID, CHILD);

        assertThat(savedState().phase()).isEqualTo(RoundPhase.REVEAL_RESULTS);
        ResultsRevealed event = (ResultsRevealed) publishedEvent();
        assertThat(event.slideId()).isEqualTo(CHILD);
    }

    @Test
    void advanceFromAScoredParentOpensTheFollowUpWithMintedCandidates() {
        followUpSession();
        stubScoredParent();
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Paris")));
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo(CHILD);
        assertThat(savedCandidates(CHILD).options()).hasSize(1);
        assertThat(publishedEvent()).isInstanceOf(RoundStarted.class);
    }

    @Test
    void advanceSkipsAFollowUpWhoseParentWasNeverScored() {
        followUpSession("s3");
        // No RoundResult for the parent — the follow-up has nothing to build on.
        when(roundResults.find(SID, PARENT)).thenReturn(Optional.empty());
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo("s3");
        verify(followUpOptions, never()).save(any(), any(), any());
    }

    @Test
    void advanceSkipsAFollowUpThatMintsNoCandidates() {
        followUpSession("s3");
        stubScoredParent();
        // Scored, but nobody submitted anything votable — an empty board is worse
        // than no board.
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of());
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo("s3");
        verify(followUpOptions, never()).save(any(), any(), any());
    }

    @Test
    void advanceSkipsASpotTheAnswerFollowUpWhoseOnlyCandidateIsTheSeededAnswer() {
        followUpSession(FollowUpMode.SPOT_THE_ANSWER, Set.of("Paris"), "s3");
        stubScoredParent();
        // Scored, but no usable text submissions: the seed alone would open a
        // one-card board where everyone picks the authored answer and collects
        // full points, a streak, and the fastest-correct bonus.
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of());
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo("s3");
        verify(followUpOptions, never()).save(any(), any(), any());
    }

    @Test
    void advanceOpensASpotTheAnswerFollowUpOnceOneRealSubmissionBacksTheSeed() {
        followUpSession(FollowUpMode.SPOT_THE_ANSWER, Set.of("Paris"), "s3");
        stubScoredParent();
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Lyon")));
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo(CHILD);
        // Two cards: the submission, and the parent's authored answer seeded in.
        assertThat(savedCandidates(CHILD).options()).hasSize(2)
                .filteredOn(option -> option.authoredAnswer())
                .singleElement()
                .satisfies(seed -> assertThat(seed.text()).isEqualTo("Paris"));
    }

    @Test
    void advanceSkipsASpotTheAnswerFollowUpOnADrawingParentWhoseOnlyCandidateIsTheSeededImage() {
        AppImage authored = authoredAnswerImage();
        drawingFollowUpSession(FollowUpMode.SPOT_THE_ANSWER, authored, "s3");
        stubScoredParent();
        when(imageUrls.displayKey(eq(authored), any())).thenReturn("gallery/answer/lg.webp");
        // Scored, but nobody drew anything: the seeded picture alone would open a
        // one-card board where every pick is the authored answer — the same
        // unplayable shape the TEXT parent has, reached through the same
        // mode-generic `requiresAnswerKey` test.
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of());
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo("s3");
        verify(followUpOptions, never()).save(any(), any(), any());
    }

    @Test
    void advanceOpensADrawingSpotTheAnswerFollowUpOnceOneRealDrawingBacksTheSeed() {
        AppImage authored = authoredAnswerImage();
        drawingFollowUpSession(FollowUpMode.SPOT_THE_ANSWER, authored, "s3");
        stubScoredParent();
        when(imageUrls.displayKey(eq(authored), any())).thenReturn("gallery/answer/lg.webp");
        AppImage submitted = new AppImage();
        submitted.setExternal(false);
        submitted.setSrcKey("drawing/" + SID + "/p-1/original");
        when(imageUrls.displayKey(eq(submitted), any())).thenReturn("drawing/" + SID + "/p-1/lg.webp");
        when(answerStore.answers(SID, PARENT))
                .thenReturn(List.of(parentDrawingAnswer("p-1", submitted)));
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        Slide opened = orchestrator.advance(SID);

        assertThat(opened.getId()).isEqualTo(CHILD);
        // Two cards: the submitted drawing, and the author's own picture seeded
        // in — both behind an opaque URL, so neither names the key it came from.
        List<FollowUpOption> board = savedCandidates(CHILD).options();
        assertThat(board).hasSize(2)
                .allSatisfy(option -> assertThat(option.imageUrl())
                        .startsWith(BACKEND_ORIGIN + "/api/media/opaque-image?t="));
        assertThat(board).filteredOn(option -> option.authoredAnswer()).hasSize(1);
    }

    @Test
    void goToRejectsADrawingSpotTheAnswerFollowUpWhoseOnlyCandidateWouldBeTheSeededImage() {
        AppImage authored = authoredAnswerImage();
        drawingFollowUpSession(FollowUpMode.SPOT_THE_ANSWER, authored);
        stubScoredParent();
        when(imageUrls.displayKey(eq(authored), any())).thenReturn("gallery/answer/lg.webp");
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of());
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orchestrator.goTo(SID, CHILD))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getCode())
                        .isEqualTo("FOLLOW_UP_NOT_PLAYABLE"));

        verify(followUpOptions, never()).save(any(), any(), any());
        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void theDrawingParentsOwnRoundStillNeverCarriesItsAnswerImage() {
        // The regression the whole mode rests on: `correctImage` becoming a real
        // authored field must not put it on the parent round's own wire, where
        // every player would see the answer before drawing. `DrawingConfigView`
        // has no such field, and nothing on this path even resolves the image.
        AppImage authored = authoredAnswerImage();
        drawingFollowUpSession(FollowUpMode.SPOT_THE_ANSWER, authored);
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        orchestrator.startRound(SID, PARENT);

        RoundStarted event = (RoundStarted) publishedEvent();
        assertThat(event.slide().drawing()).isNotNull();
        assertThat(event.slide().drawing().imagePromptUrl()).isNull();
        verify(imageUrls, never()).displayUrl(eq(authored), any());
        verify(imageUrls, never()).displayKey(eq(authored), any());
    }

    @Test
    void advancePastASkippedTerminalFollowUpEndsTheDeck() {
        followUpSession(); // the follow-up is the last slide of the snapshot
        when(roundResults.find(SID, PARENT)).thenReturn(Optional.empty());
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.REVEAL_RESPONSES, PARENT, Instant.now(), null, null, 0L, false)));

        // Skipping off the end is an exhausted snapshot like any other — null,
        // no round opened, nothing published.
        assertThat(orchestrator.advance(SID)).isNull();
        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void goToRejectsAFollowUpWhoseParentWasNeverScored() {
        followUpSession();
        when(roundResults.find(SID, PARENT)).thenReturn(Optional.empty());
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orchestrator.goTo(SID, CHILD))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getCode())
                        .isEqualTo("PARENT_ROUND_NOT_SCORED"));

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void goToRejectsASpotTheAnswerFollowUpWhoseOnlyCandidateWouldBeTheSeededAnswer() {
        followUpSession(FollowUpMode.SPOT_THE_ANSWER, Set.of("Paris"));
        stubScoredParent();
        // The same board `advance` steps over: with no usable submissions the
        // seed is the only card, so every pick grades correct. Naming the slide
        // in the rail must not open it either — the host gets a 409 instead of
        // the silent skip.
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of());
        when(roundResults.answersOf(SID, PARENT)).thenReturn(List.of());
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> orchestrator.goTo(SID, CHILD))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getCode())
                        .isEqualTo("FOLLOW_UP_NOT_PLAYABLE"));

        verify(followUpOptions, never()).save(any(), any(), any());
        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void goToOpensAFollowUpOnceItsParentRoundBacksAPlayableBoard() {
        followUpSession(FollowUpMode.SPOT_THE_ANSWER, Set.of("Paris"));
        stubScoredParent();
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Lyon")));
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        orchestrator.goTo(SID, CHILD);

        assertThat(savedState().currentSlideId()).isEqualTo(CHILD);
        assertThat(savedCandidates(CHILD).options()).hasSize(2);
        assertThat(publishedEvent()).isInstanceOf(RoundStarted.class);
    }

    @Test
    void restartingAFollowUpReMintsItsCandidates() {
        followUpSession();
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        when(answerStore.answers(SID, PARENT)).thenReturn(List.of(parentAnswer("p-1", "Paris")));

        orchestrator.restartRound(SID, CHILD);

        // The mint is deterministic, so the re-run board is the same board — but it
        // is re-snapshotted rather than left behind.
        InOrder inOrder = inOrder(followUpOptions);
        inOrder.verify(followUpOptions).clear(SID, CHILD);
        inOrder.verify(followUpOptions).save(eq(SID), eq(CHILD), any());
        assertThat(savedCandidates(CHILD).options()).hasSize(1);
    }

    @Test
    void endingTheSessionClearsFollowUpCandidatesForEverySlide() {
        LiveSession session = followUpSession();
        when(session.isTerminal()).thenReturn(false);
        when(session.getRoster()).thenReturn(List.of());
        when(participants.findAllById(any())).thenReturn(List.of());

        orchestrator.endLiveSession(SID);

        verify(followUpOptions).clear(SID, PARENT);
        verify(followUpOptions).clear(SID, CHILD);
    }

    @Test
    void advanceReturnsNullWhenSnapshotExhausted() {
        Slide only = slideWithId(SLIDE);
        LiveSession session = navigableSession(List.of(only));
        when(roundStateStore.load(SID)).thenReturn(
                Optional.of(new LiveRoundState(PUB, RoundPhase.REVEAL_RESULTS, SLIDE, Instant.now(), null, null, 0L, false)));
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

        orchestrator.heartbeat(SID, "p-1", false);

        verify(presenceStore, never()).save(any(), any(), any());
    }

    @Test
    void heartbeatSavesWhenPresenceIsStale() {
        when(presenceStore.find(SID, "p-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.ONLINE, Instant.now().minusSeconds(5))));

        orchestrator.heartbeat(SID, "p-1", false);

        verify(presenceStore).save(eq(SID), eq("p-1"), any());
    }

    // ── Round timers (ADR 002) ───────────────────────────────────────────────

    /** Like {@link #givenSlideWithMode} but with a countdown, so the round opens timed. */
    private void givenTimedSlide(int countdownSeconds) {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        slide.setSettings(new SlideSettings(null,
                new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, false, countdownSeconds, false, 1)));

        LiveSession session = mock(LiveSession.class);
        Deck deck = mock(Deck.class);
        when(session.getDeck()).thenReturn(deck);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getId()).thenReturn(SID);
        when(deck.findSlide(SLIDE)).thenReturn(Optional.of(slide));
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
    }

    private void stubTimedOpenRound(Instant startedAt, Instant pausedAt, long accumulatedPauseMs) {
        stubTimedOpenRound(startedAt, pausedAt, accumulatedPauseMs, false);
    }

    private void stubTimedOpenRound(Instant startedAt, Instant pausedAt, long accumulatedPauseMs,
            boolean autoPaused) {
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                PUB, RoundPhase.SUBMIT, SLIDE, startedAt, 30_000L, pausedAt, accumulatedPauseMs, autoPaused)));
    }

    @Test
    void timedRoundOpensWithScheduledCloseDeadline() {
        givenTimedSlide(30);

        orchestrator.startRound(SID, SLIDE);

        LiveRoundState saved = savedState();
        assertThat(saved.durationMs()).isEqualTo(30_000L);
        verify(deadlines).schedule(SessionDeadline.closeRound(SID, SLIDE), saved.deadline());
        RoundStarted event = (RoundStarted) publishedEvent();
        assertThat(event.deadline()).isEqualTo(saved.deadline());
    }

    @Test
    void untimedRoundSchedulesNothing() {
        givenSlideWithMode(ResultsDisplayMode.MANUAL);

        orchestrator.startRound(SID, SLIDE);

        assertThat(savedState().durationMs()).isNull();
        verify(deadlines, never()).schedule(any(), any());
        assertThat(((RoundStarted) publishedEvent()).deadline()).isNull();
    }

    @Test
    void closeCancelsThePendingDeadline() {
        stubPhase(RoundPhase.SUBMIT);
        stubScorableSession();

        orchestrator.closeSubmissions(SID, SLIDE);

        verify(deadlines).cancel(SessionDeadline.closeRound(SID, SLIDE));
    }

    @Test
    void staleCloseForAnotherSlideIsIgnored() {
        // The timer fired after the host had already moved on to another slide.
        stubPhase(RoundPhase.SUBMIT);

        orchestrator.closeSubmissions(SID, "some-old-slide");

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
        verify(deadlines, never()).cancel(any());
    }

    @Test
    void pauseStampsStateCancelsDeadlineAndPublishes() {
        Instant startedAt = Instant.now().minusSeconds(10);
        stubTimedOpenRound(startedAt, null, 0L);

        orchestrator.pauseTimer(SID, SLIDE);

        LiveRoundState saved = savedState();
        assertThat(saved.isPaused()).isTrue();
        verify(deadlines).cancel(SessionDeadline.closeRound(SID, SLIDE));
        TimerPaused event = (TimerPaused) publishedEvent();
        assertThat(event.slideId()).isEqualTo(SLIDE);
        assertThat(event.pausedAt()).isEqualTo(saved.pausedAt());
    }

    @Test
    void manualPauseConvertsAnAutoPauseIntoADeliberateOne() {
        // The freeze stays, but the flag clears so a later host beat won't
        // auto-resume a round the host just chose to hold.
        Instant pausedAt = Instant.now().minusSeconds(5);
        stubTimedOpenRound(Instant.now().minusSeconds(20), pausedAt, 0L, true);

        orchestrator.pauseTimer(SID, SLIDE);

        LiveRoundState saved = savedState();
        assertThat(saved.autoPaused()).isFalse();
        assertThat(saved.pausedAt()).isEqualTo(pausedAt);
        verify(publisher, never()).publish(any(), any()); // nothing visible changed
    }

    @Test
    void pauseOnUntimedRoundIsRejected() {
        stubPhase(RoundPhase.SUBMIT); // open but untimed

        assertThatThrownBy(() -> orchestrator.pauseTimer(SID, SLIDE))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("timer");
        verify(roundStateStore, never()).save(any(), any());
    }

    @Test
    void resumeFoldsPauseReschedulesAndPublishes() {
        Instant startedAt = Instant.now().minusSeconds(20);
        stubTimedOpenRound(startedAt, Instant.now().minusSeconds(5), 0L);

        orchestrator.resumeTimer(SID, SLIDE);

        LiveRoundState saved = savedState();
        assertThat(saved.isPaused()).isFalse();
        assertThat(saved.accumulatedPauseMs()).isGreaterThanOrEqualTo(5_000L);
        verify(deadlines).schedule(SessionDeadline.closeRound(SID, SLIDE), saved.deadline());
        TimerResumed event = (TimerResumed) publishedEvent();
        assertThat(event.deadline()).isEqualTo(saved.deadline());
    }

    @Test
    void resumeWhenNotPausedIsIdempotent() {
        stubTimedOpenRound(Instant.now().minusSeconds(10), null, 0L);

        orchestrator.resumeTimer(SID, SLIDE);

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void hostHeartbeatArmsLivenessAndCallsOffGrace() {
        when(presenceStore.find(SID, "host-1")).thenReturn(Optional.empty());

        orchestrator.heartbeat(SID, "host-1", true);

        verify(deadlines).schedule(eq(SessionDeadline.hostAway(SID)), any(Instant.class));
        verify(deadlines).cancel(SessionDeadline.graceCancel(SID));
    }

    private LiveSession hostSession(String hostId) {
        LiveSession session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn(PUB);
        when(session.getHostParticipantId()).thenReturn(hostId);
        when(repo.findById(SID)).thenReturn(Optional.of(session));
        return session;
    }

    @Test
    void hostPresenceLossAutoPausesAndStartsGrace() {
        hostSession("host-1");
        when(presenceStore.find(SID, "host-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.ONLINE, Instant.now().minusSeconds(120))));
        stubTimedOpenRound(Instant.now().minusSeconds(10), null, 0L);

        orchestrator.hostPresenceLost(SID);

        // The open timed round auto-paused (flagged, so a returning host's beat
        // can undo it) and its close deadline was pulled.
        LiveRoundState saved = savedState();
        assertThat(saved.isPaused()).isTrue();
        assertThat(saved.autoPaused()).isTrue();
        verify(deadlines).cancel(SessionDeadline.closeRound(SID, SLIDE));
        // The host is broadcast as disconnected and the grace countdown armed.
        ArgumentCaptor<Presence> presence = ArgumentCaptor.forClass(Presence.class);
        verify(presenceStore).save(eq(SID), eq("host-1"), presence.capture());
        assertThat(presence.getValue().status()).isEqualTo(ConnectionStatus.DISCONNECTED);
        verify(deadlines).schedule(eq(SessionDeadline.graceCancel(SID)), any(Instant.class));
        ArgumentCaptor<SessionEvent> events = ArgumentCaptor.forClass(SessionEvent.class);
        verify(publisher, times(2)).publish(eq(PUB), events.capture());
        assertThat(events.getAllValues().get(0)).isInstanceOf(TimerPaused.class);
        assertThat(events.getAllValues().get(1)).isInstanceOf(PresenceChanged.class);
    }

    @Test
    void hostPresenceLossWithFreshBeatJustRearms() {
        hostSession("host-1");
        Instant lastSeen = Instant.now().minusSeconds(2);
        when(presenceStore.find(SID, "host-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.ONLINE, lastSeen)));

        orchestrator.hostPresenceLost(SID);

        verify(deadlines).schedule(eq(SessionDeadline.hostAway(SID)), any(Instant.class));
        verify(deadlines, never()).schedule(eq(SessionDeadline.graceCancel(SID)), any(Instant.class));
        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void hostHeartbeatResumesAnAutoPausedRound() {
        // The disconnect pause self-heals when the host is provably back.
        when(presenceStore.find(SID, "host-1")).thenReturn(Optional.empty());
        stubTimedOpenRound(Instant.now().minusSeconds(20), Instant.now().minusSeconds(5), 0L, true);

        orchestrator.heartbeat(SID, "host-1", true);

        LiveRoundState saved = savedState();
        assertThat(saved.isPaused()).isFalse();
        assertThat(saved.autoPaused()).isFalse();
        verify(deadlines).schedule(SessionDeadline.closeRound(SID, SLIDE), saved.deadline());
        assertThat(publishedEvent()).isInstanceOf(TimerResumed.class);
    }

    @Test
    void hostHeartbeatNeverResumesADeliberatePause() {
        when(presenceStore.find(SID, "host-1")).thenReturn(Optional.empty());
        stubTimedOpenRound(Instant.now().minusSeconds(20), Instant.now().minusSeconds(5), 0L, false);

        orchestrator.heartbeat(SID, "host-1", true);

        verify(roundStateStore, never()).save(any(), any());
        verify(publisher, never()).publish(any(), any());
    }

    @Test
    void hostGraceExpiryCancelsTheSession() {
        LiveSession session = hostSession("host-1");
        Deck deck = mock(Deck.class);
        when(deck.getSlides()).thenReturn(List.of());
        when(session.getDeck()).thenReturn(deck);
        when(presenceStore.find(SID, "host-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.DISCONNECTED, Instant.now().minusSeconds(300))));

        orchestrator.hostGraceExpired(SID);

        verify(session).cancel();
        verify(repo).save(session);
        verify(deadlines).cancel(SessionDeadline.hostAway(SID));
        verify(deadlines).cancel(SessionDeadline.graceCancel(SID));
        assertThat(publishedEvent()).isInstanceOf(LiveSessionCancelled.class);
    }

    @Test
    void hostGraceExpiryWithReturnedHostRearmsInstead() {
        hostSession("host-1");
        when(presenceStore.find(SID, "host-1")).thenReturn(
                Optional.of(new Presence(ConnectionStatus.ONLINE, Instant.now().minusSeconds(1))));

        orchestrator.hostGraceExpired(SID);

        verify(deadlines).schedule(eq(SessionDeadline.hostAway(SID)), any(Instant.class));
        verify(publisher, never()).publish(any(), any());
        verify(repo, never()).save(any(LiveSession.class));
    }
}
