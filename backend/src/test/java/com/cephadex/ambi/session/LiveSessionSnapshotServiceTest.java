package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
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
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.dto.SessionSnapshotResponse;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.ParticipantResolver;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.PresenceStore;
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
        service = new LiveSessionSnapshotService(sessions, participants, participantResolver,
                roundStateStore, tallyStore, presenceStore);

        caller = new AmbiPrincipal(IdentityState.GUEST, "user-1", "pub-user", UserLevel.GUEST,
                AuthProvider.INTERNAL, null, null, "sid-1");

        host = participant("host-1", "Hosty");
        player = participant("player-2", "Player");

        session = mock(LiveSession.class);
        when(session.getId()).thenReturn(SID);
        when(session.getPublicId()).thenReturn("pub-1");
        when(session.getStatus()).thenReturn(LiveSessionLifecycle.IN_PROGRESS);
        when(session.getPhase()).thenReturn(RoundPhase.SUBMIT);
        when(session.getRoster()).thenReturn(List.of("host-1", "player-2"));
        when(session.isHost("host-1")).thenReturn(true);

        when(sessions.findById(SID)).thenReturn(Optional.of(session));
        when(participants.findAllById(List.of("host-1", "player-2"))).thenReturn(List.of(host, player));
        when(participantResolver.resolve(session, caller)).thenReturn(host);
        when(presenceStore.all(SID)).thenReturn(Map.of());
    }

    @Test
    void assemblesLobbySnapshotWithNoOpenRound() {
        when(roundStateStore.load(SID)).thenReturn(Optional.empty());

        SessionSnapshotResponse snap = service.getSnapshot(SID, caller);

        assertThat(snap.sessionId()).isEqualTo(SID);
        assertThat(snap.publicId()).isEqualTo("pub-1");
        assertThat(snap.currentSlideId()).isNull();
        assertThat(snap.currentSlide()).isNull();
        assertThat(snap.optionTally()).isNull();
        // Roster preserves join order; the caller is identified and flagged as host.
        assertThat(snap.roster()).extracting("participantId").containsExactly("host-1", "player-2");
        assertThat(snap.viewerParticipantId()).isEqualTo("host-1");
        assertThat(snap.viewerIsHost()).isTrue();
        assertThat(snap.scoreboard()).hasSize(2);
    }

    @Test
    void assemblesInRoundSnapshotWithSlideAndTally() {
        Slide slide = mock(Slide.class);
        when(slide.getId()).thenReturn("slide-1");
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
        assertThat(snap.currentRoundStartedAt()).isEqualTo(startedAt);
        assertThat(snap.optionTally()).containsEntry("opt-a", 3).containsEntry("opt-b", 1);
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
