package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import com.cephadex.ambi.auth.enums.AuthProvider;
import com.cephadex.ambi.auth.enums.IdentityState;
import com.cephadex.ambi.auth.security.AmbiPrincipal;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings.AnswerSettings;
import com.cephadex.ambi.presentation.deck.Settings.DeckSettings;
import com.cephadex.ambi.presentation.deck.Settings.InviteSettings;
import com.cephadex.ambi.presentation.deck.Settings.SlideSettings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.QAndAContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.QAndAHostAnswerStore;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.user.enums.UserLevel;

class LiveSessionSnapshotServiceTest {

    private static final String SID = "sess-1";

    private LiveSessionRepository sessions;
    private ParticipantRepository participants;
    private ParticipantResolver participantResolver;
    private LiveRoundStateStore roundStateStore;
    private TallyStore tallyStore;
    private PresenceStore presenceStore;
    private AnswerStore answerStore;
    private QAndAHostAnswerStore qandaHostAnswers;
    private LiveSessionSnapshotService service;

    private AmbiPrincipal caller;
    private LiveSession session;
    private Participant host;
    private Participant player;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        participantResolver = mock(ParticipantResolver.class);
        roundStateStore = mock(LiveRoundStateStore.class);
        tallyStore = mock(TallyStore.class);
        presenceStore = mock(PresenceStore.class);
        answerStore = mock(AnswerStore.class);
        qandaHostAnswers = mock(QAndAHostAnswerStore.class);
        service = new LiveSessionSnapshotService(sessions, participants, participantResolver,
                roundStateStore, tallyStore, presenceStore, answerStore, qandaHostAnswers);

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
        when(session.getRoster()).thenReturn(List.of("host-1", "player-2"));
        when(session.isHost("host-1")).thenReturn(true);

        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(List.of("host-1", "player-2"))).thenReturn(List.of(host, player));
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
                .thenReturn(Optional.of(new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", startedAt)));
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
    void qandaRoundSnapshotCarriesQuestionsAndConfig() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new QAndAContent(3, false));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT_LIVE, "slide-1", Instant.parse("2026-07-01T10:00:00Z"))));

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
                List.of(new GridItem("it-1", "One", null)),
                Map.of("it-1", "0,1"),
                ScoreMode.EXACT));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"))));

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.currentSlide()).isNotNull();
        assertThat(snap.currentSlide().grid()).isNotNull();
        assertThat(snap.currentSlide().grid().rowLabels()).containsExactly("Row A");
        assertThat(snap.currentSlide().grid().colLabels()).containsExactly("Col A", "Col B");
        assertThat(snap.currentSlide().grid().items()).singleElement()
                .satisfies(item -> {
                    assertThat(item.id()).isEqualTo("it-1");
                    assertThat(item.label()).isEqualTo("One");
                });
        // The answer key must never travel: GridConfigView has no correctCells at all.
    }

    @Test
    void axisRoundSnapshotCarriesPlaneConfigWithoutAnswerKeyOrTolerance() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        when(slide.getContent()).thenReturn(new AxisContent(
                "Weak", "Strong", "Slow", "Fast",
                List.of(new AxisItem("it-1", "One")),
                Map.of("it-1", new AxisPoint(0.3, 0.7)),
                0.1,
                ScoreMode.INSIDE_RADIUS));
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"))));

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
    void nonQandaRoundSnapshotCarriesNoQuestionList() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
        Deck deck = mock(Deck.class);
        when(deck.findSlide("slide-1")).thenReturn(Optional.of(slide));
        when(session.getDeck()).thenReturn(deck);
        when(roundStateStore.load(SID)).thenReturn(Optional.of(
                new LiveRoundState("pub-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-07-01T10:00:00Z"))));

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
