package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.media.storage.ImageUrlResolver;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.DeckSettings;
import com.cephadex.ambi.presentation.deck.Settings.InviteSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.session.participant.SessionRoster;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.EventSequenceStore;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.QAndAHostAnswerStore;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.session.redis.VoteOption;
import com.cephadex.ambi.session.redis.VoteStore;
import com.cephadex.ambi.user.enums.UserLevel;

class LiveSessionSnapshotServiceTest {

    private static final String SID = "sess-1";

    private LiveSessionRepository sessions;
    private SessionRoster sessionRoster;
    private ParticipantResolver participantResolver;
    private LiveRoundStateStore roundStateStore;
    private TallyStore tallyStore;
    private PresenceStore presenceStore;
    private AnswerStore answerStore;
    private VoteStore voteStore;
    private QAndAHostAnswerStore qandaHostAnswers;
    private FollowUpOptionStore followUpOptions;
    private EventSequenceStore eventSequences;
    private LiveSessionSnapshotService service;

    private AmbiPrincipal caller;
    private LiveSession session;
    private Participant host;
    private Participant player;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        sessionRoster = mock(SessionRoster.class);
        participantResolver = mock(ParticipantResolver.class);
        roundStateStore = mock(LiveRoundStateStore.class);
        tallyStore = mock(TallyStore.class);
        presenceStore = mock(PresenceStore.class);
        answerStore = mock(AnswerStore.class);
        voteStore = mock(VoteStore.class);
        qandaHostAnswers = mock(QAndAHostAnswerStore.class);
        followUpOptions = mock(FollowUpOptionStore.class);
        eventSequences = mock(EventSequenceStore.class);
        service = new LiveSessionSnapshotService(sessions, sessionRoster, participantResolver,
                roundStateStore, tallyStore, presenceStore, answerStore, voteStore, qandaHostAnswers,
                followUpOptions, eventSequences, mock(ImageUrlResolver.class));

        caller = new AmbiPrincipal(IdentityState.GUEST, "user-1", "pub-user", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sid-1");

        host = participant("host-1", "Hosty");
        player = participant("player-2", "Player");

        session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn("pub-1");
        when(session.getRoomCode()).thenReturn("ROOMCODE");
        when(session.getStatus()).thenReturn(LiveSessionLifecycle.IN_PROGRESS);
        when(session.getPhase()).thenReturn(RoundPhase.SUBMIT);
        when(session.isHost("host-1")).thenReturn(true);

        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(sessionRoster.participants(SID)).thenReturn(List.of(host, player));
        when(participantResolver.resolve(session, caller)).thenReturn(host);
        when(presenceStore.all(SID)).thenReturn(Map.of());
        // Deck present with no settings by default; tests that care about invite
        // flags stub their own deck + settings.
        when(session.getDeck()).thenReturn(mock(Deck.class));
    }

    @Test
    void assemblesLobbySnapshotWithNoOpenRound() {
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.sessionId()).isEqualTo(SID);
        assertThat(snap.publicId()).isEqualTo("pub-1");
        assertThat(snap.roomCode()).isEqualTo("ROOMCODE");
        assertThat(snap.currentSlideId()).isNull();
        assertThat(snap.currentSlide()).isNull();
        assertThat(snap.optionTally()).isNull();
        // Roster preserves join order; the caller is identified and flagged as host.
        assertThat(snap.roster()).extracting("participantId").containsExactly("host-1", "player-2");
        assertThat(snap.viewerParticipantId()).isEqualTo("host-1");
        assertThat(snap.viewerIsHost()).isTrue();
        assertThat(snap.scoreboard()).hasSize(2);
        // No deck settings stubbed in this test — invite flags default to false.
        assertThat(snap.showRoomCodeInHeader()).isFalse();
        assertThat(snap.showJoinInfoInResults()).isFalse();
    }

    @Test
    void snapshotCarriesTheSessionsLastEventSequence() {
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        // Keyed by the publicId — the same id events are published and routed under,
        // not the internal session id.
        when(eventSequences.lastSequence("pub-1")).thenReturn(12L);

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.lastSequence()).isEqualTo(12L);
    }

    @Test
    void lastSequenceIsZeroWhenNoEventHasBeenPublished() {
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());
        // Absent counter key: the store reports 0, i.e. nothing to reconcile against.
        when(eventSequences.lastSequence("pub-1")).thenReturn(0L);

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.lastSequence()).isZero();
    }

    @Test
    void snapshotExposesInviteSettingsFromDeck() {
        Deck deck = mock(Deck.class);
        when(deck.getSettings()).thenReturn(new DeckSettings(null, null, null, new InviteSettings(true, true)));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.showRoomCodeInHeader()).isTrue();
        assertThat(snap.showJoinInfoInResults()).isTrue();
    }

    @Test
    void assemblesInRoundSnapshotWithSlideAndTally() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        // A per-slide answer-settings override drives the participant-safe view.
        when(slide.getSettings()).thenReturn(new SlideSettings(null,
                new AnswerSettings(ResultsDisplayMode.MANUAL, false, false, false, 0, false, 2)));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);

        Instant startedAt = Instant.parse("2026-07-01T10:00:00Z");
        when(roundStateStore.load(SID))
                .thenReturn(Optional.of(new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", startedAt, null, null, 0L, false)));
        when(tallyStore.tally(SID, "slide-1")).thenReturn(Map.of("opt-a", 3, "opt-b", 1));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.phase()).isEqualTo(RoundPhase.SUBMIT_LIVE);
        assertThat(snap.currentSlideId()).isEqualTo("slide-1");
        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().id()).isEqualTo("slide-1");
        assertThat(snap.currentSlide().answerSettings()).isNotNull();
        assertThat(snap.currentSlide().answerSettings().maxSelections()).isEqualTo(2);
        assertThat(snap.currentRoundStartedAt()).isEqualTo(startedAt);
        assertThat(snap.optionTally()).containsEntry("opt-a", 3).containsEntry("opt-b", 1);
    }

    @Test
    void voteRoundSnapshotCarriesAnonymousOptionsAndTheViewersVote() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.VOTE, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));
        when(voteStore.options(SID, "slide-1")).thenReturn(Map.of(
                "opt-b", new VoteOption("player-2", "a plausible lie", null),
                "opt-a", new VoteOption("host-1", "the truth", null)));
        when(voteStore.voteOf(SID, "slide-1", "host-1")).thenReturn(Optional.of("opt-b"));
        when(voteStore.count(SID, "slide-1")).thenReturn(1L);

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.phase()).isEqualTo(RoundPhase.VOTE);
        // Options are sorted by their opaque ids and never name an author.
        assertThat(snap.voteOptions()).extracting("optionId").containsExactly("opt-a", "opt-b");
        assertThat(snap.voteOptions()).extracting("text").containsExactly("the truth", "a plausible lie");
        assertThat(snap.myVoteOptionId()).isEqualTo("opt-b");
        assertThat(snap.votesCast()).isEqualTo(1);
    }

    @Test
    void nonVoteRoundSnapshotCarriesNoVoteFields() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.voteOptions()).isNull();
        assertThat(snap.myVoteOptionId()).isNull();
        assertThat(snap.votesCast()).isNull();
    }

    /**
     * A follow-up round open on {@code slide-followup}, chained off {@code slide-1}
     * and holding a two-candidate board authored by {@code host-1} and
     * {@code player-2}.
     */
    private void givenOpenFollowUpRound() {
        Slide parent = mock(Slide.class);
        when(parent.getId()).thenReturn("slide-1");
        when(parent.getTitle()).thenReturn("Name a capital");
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-followup");
        when(slide.getParentId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new FollowUpContent(FollowUpMode.BEST_ANSWER_VOTE));

        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-followup")).thenReturn(Optional.of(slide));
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(parent));
        when(deck.isAttachedFollowUp(slide)).thenReturn(true);
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                "pub-1", RoundPhase.SUBMIT, "slide-followup", Instant.parse("2026-07-01T10:00:00Z"), null, null,
                0L, false)));
        when(followUpOptions.load(SID, "slide-followup")).thenReturn(new FollowUpOptionSet(List.of(
                new FollowUpOption("cand-1", "Minas Tirith", null, Set.of("player-2"), false),
                new FollowUpOption("cand-2", "Osgiliath", null, Set.of("host-1"), false))));
    }

    @Test
    void followUpRoundSnapshotCarriesTheBoardAndTheViewersOwnCandidate() {
        givenOpenFollowUpRound();

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        // The rehydrated board is the saved snapshot, in its minted order, naming
        // the parent round it reads.
        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().followUp()).isNotNull();
        assertThat(snap.currentSlide().followUp().mode()).isEqualTo(FollowUpMode.BEST_ANSWER_VOTE);
        assertThat(snap.currentSlide().followUp().parentSlideId()).isEqualTo("slide-1");
        assertThat(snap.currentSlide().followUp().parentTitle()).isEqualTo("Name a capital");
        assertThat(snap.currentSlide().followUp().options()).extracting("optionId")
                .containsExactly("cand-1", "cand-2");
        // The viewer (host-1) authored the second candidate — per-participant, so it
        // travels only here, never on the broadcast board.
        assertThat(snap.myFollowUpOptionId()).isEqualTo("cand-2");
    }

    @Test
    void followUpRoundSnapshotHasNoOwnCandidateForANonAuthor() {
        givenOpenFollowUpRound();
        // The viewer joined after the parent round, so no candidate is theirs.
        Participant latecomer = participant("late-9", "Latecomer");
        when(participantResolver.resolve(session, caller)).thenReturn(latecomer);

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide().followUp().options()).hasSize(2);
        assertThat(snap.myFollowUpOptionId()).isNull();
    }

    @Test
    void nonFollowUpRoundSnapshotCarriesNoFollowUpFields() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                "pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide().followUp()).isNull();
        assertThat(snap.currentSlide().hasFollowUp()).isFalse();
        assertThat(snap.myFollowUpOptionId()).isNull();
    }

    @Test
    void aParentRoundSnapshotIsMarkedAsHavingAFollowUp() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Slide child = mock(Slide.class);
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(deck.attachedFollowUp(slide)).thenReturn(Optional.of(child));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(new LiveRoundState(
                "pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        // The host bar reads this to drop "Reveal answers" and advance into the child.
        assertThat(snap.currentSlide().hasFollowUp()).isTrue();
        assertThat(snap.currentSlide().followUp()).isNull();
    }

    @Test
    void qandaRoundSnapshotCarriesQuestionsAndConfig() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new QAndAContent(3, false));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        Answer asked = new Answer();
        asked.setParticipantId("player-2");
        asked.setSessionId(SID);
        asked.setSlideId("slide-1");
        asked.setSubmittedAt(Instant.parse("2026-07-01T10:01:00Z"));
        asked.setPayload(new QAndAQuestions(List.of(
                new QAndAQuestions.QuestionEntry("q-1", "Why?", Instant.parse("2026-07-01T10:01:00Z")))));
        when(answerStore.answers(SID, "slide-1")).thenReturn(List.of(asked));
        when(qandaHostAnswers.all(SID, "slide-1")).thenReturn(Map.of("q-1", "Because."));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().qAndA()).isNotNull();
        assertThat(snap.currentSlide().qAndA().maxResponses()).isEqualTo(3);
        assertThat(snap.qAndAQuestions()).singleElement().satisfies(q -> {
            assertThat(q.id()).isEqualTo("q-1");
            assertThat(q.participantId()).isEqualTo("player-2");
            assertThat(q.text()).isEqualTo("Why?");
            assertThat(q.hostAnswer()).isEqualTo("Because.");
        });
    }

    @Test
    void gridRoundSnapshotCarriesMatrixConfigWithoutAnswerKey() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new GridContent(
                List.of("Row A"), List.of("Col A", "Col B"),
                List.of(new GridItem("it-1", "One", null, "#aabbcc")),
                Map.of("it-1", "0,1"),
                ScoreMode.EXACT));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().grid()).isNotNull();
        assertThat(snap.currentSlide().grid().rowLabels()).containsExactly("Row A");
        assertThat(snap.currentSlide().grid().colLabels()).containsExactly("Col A", "Col B");
        assertThat(snap.currentSlide().grid().items()).singleElement()
                .satisfies(item -> {
                    assertThat(item.id()).isEqualTo("it-1");
                    assertThat(item.label()).isEqualTo("One");
                    assertThat(item.imageUrl()).isNull();
                    assertThat(item.color()).isEqualTo("#aabbcc");
                });
        // The answer key must never travel: GridConfigView has no correctCells at all.
    }

    @Test
    void axisRoundSnapshotCarriesPlaneConfigWithoutAnswerKeyOrTolerance() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new AxisContent(
                "Weak", "Strong", "Slow", "Fast",
                List.of(new AxisItem("it-1", "One", null, null)),
                Map.of("it-1", new AxisPoint(0.3, 0.7)),
                0.1,
                ScoreMode.INSIDE_RADIUS));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().axis()).isNotNull();
        assertThat(snap.currentSlide().axis().xLowLabel()).isEqualTo("Weak");
        assertThat(snap.currentSlide().axis().xHighLabel()).isEqualTo("Strong");
        assertThat(snap.currentSlide().axis().yLowLabel()).isEqualTo("Slow");
        assertThat(snap.currentSlide().axis().yHighLabel()).isEqualTo("Fast");
        assertThat(snap.currentSlide().axis().items()).singleElement()
                .satisfies(item -> {
                    assertThat(item.id()).isEqualTo("it-1");
                    assertThat(item.label()).isEqualTo("One");
                });
        // The grading secrets must never travel: AxisConfigView has neither
        // correctPositions nor tolerance at all.
    }

    @Test
    void placeOnImageRoundSnapshotCarriesBackingImageWithoutTargets() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new PlaceOnImageContent(
                null,
                List.of(new PlaceItem("t-1", "Here", null, "#ff0000")),
                Map.of("t-1", new PlacePoint(0.4, 0.6)),
                0.1,
                ScoreMode.INSIDE_RADIUS));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        // SUBMIT phase: answering is open, so the answer key must stay hidden.
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().placeOnImage()).isNotNull();
        // The config view exposes the item to place — its id / label / color —
        // but PlaceItemView has no coordinate field at all, so the answer key
        // (x, y, radius) never travels pre-reveal, and placeTargets stays absent
        // while answering is open.
        assertThat(snap.currentSlide().placeOnImage().items()).singleElement()
                .satisfies(item -> {
                    assertThat(item.id()).isEqualTo("t-1");
                    assertThat(item.label()).isEqualTo("Here");
                    assertThat(item.color()).isEqualTo("#ff0000");
                });
        assertThat(snap.placeTargets()).isNull();
    }

    @Test
    void placeOnImageSnapshotDisclosesTargetsAtReveal() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new PlaceOnImageContent(
                null,
                List.of(new PlaceItem("t-1", "Here", null, "#ff0000")),
                Map.of("t-1", new PlacePoint(0.4, 0.6)),
                0.1,
                ScoreMode.INSIDE_RADIUS));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        // REVEAL_RESULTS: the correct-location circles are now disclosed, so a
        // late joiner rehydrates the same reveal the ResultsRevealed delta carries.
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.REVEAL_RESULTS, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        // Geometry only, keyed by item id: the label and color are already on the
        // participant-safe config view, so the board resolves them from there.
        assertThat(snap.placeTargets()).singleElement()
                .satisfies(target -> {
                    assertThat(target.itemId()).isEqualTo("t-1");
                    assertThat(target.x()).isEqualTo(0.4);
                    assertThat(target.y()).isEqualTo(0.6);
                    assertThat(target.radius()).isEqualTo(0.1);
                });
        // The participant-safe config view still never carries the key.
        assertThat(snap.currentSlide().placeOnImage()).isNotNull();
    }

    @Test
    void snapshotWithholdsAllocationTargetsUntilResultsReveal() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(allocationContent());
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        // SUBMIT phase: answering is open, so the answer key must stay hidden.
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        // The config view exposes the options and the point pool, but carries
        // neither the authored split nor the tolerance that grades it.
        assertThat(snap.currentSlide().allocation()).isNotNull();
        assertThat(snap.currentSlide().allocation().totalPointsToAllocate()).isEqualTo(100);
        assertThat(snap.currentSlide().allocation().options()).extracting("id")
                .containsExactly("alloc-1", "alloc-2");
        assertThat(snap.allocationTargets()).isNull();
    }

    @Test
    void snapshotCarriesAllocationTargetsDuringResultsReveal() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(allocationContent());
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        // REVEAL_RESULTS: the authored split is now disclosed, so a late joiner
        // rehydrates the same reveal the ResultsRevealed delta carries.
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.REVEAL_RESULTS, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        // Key only, keyed by option id: the label and colour are already on the
        // participant-safe config view, so the board resolves them from there.
        assertThat(snap.allocationTargets()).singleElement()
                .satisfies(target -> {
                    assertThat(target.optionId()).isEqualTo("alloc-1");
                    assertThat(target.points()).isEqualTo(70);
                    assertThat(target.tolerance()).isEqualTo(5);
                });
        // The participant-safe config view still never carries the key.
        assertThat(snap.currentSlide().allocation()).isNotNull();
    }

    /** Two options, only the first keyed, so the reveal projection is observable. */
    private static AllocationContent allocationContent() {
        return new AllocationContent(
                List.of(new McqOption("alloc-1", McqOptionType.TEXT, "Gondor", null, null),
                        new McqOption("alloc-2", McqOptionType.TEXT, "Rohan", null, null)),
                Map.of("alloc-1", 70),
                100,
                5);
    }

    @Test
    void nonQandaRoundSnapshotCarriesNoQuestionList() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"), null, null, 0L, false)));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.qAndAQuestions()).isNull();
    }

    @Test
    void rejectsCallerNotOnRoster() {
        when(participantResolver.resolve(session, caller))
                .thenThrow(new ForbiddenException("NOT_A_PARTICIPANT", "not a participant in this session"));

        assertThatThrownBy(() -> service.getSnapshot(SID, caller))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void throwsWhenSessionMissing() {
        when(sessions.findById("nope")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getSnapshot("nope", caller))
                .isInstanceOf(NotFoundException.class);
    }

    private static Participant participant(String id, String name) {
        Participant p = mock(Participant.class);
        when(p.getParticipantId()).thenReturn(id);
        when(p.getDisplayName()).thenReturn(name);
        when(p.getColorTag()).thenReturn(null);
        when(p.getAvatar()).thenReturn(null);
        when(p.getConnectionStatus()).thenReturn(ConnectionStatus.ONLINE);
        when(p.getScore()).thenReturn(null);
        return p;
    }
}
