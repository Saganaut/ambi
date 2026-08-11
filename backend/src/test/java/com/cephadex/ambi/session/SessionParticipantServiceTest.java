package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.InOrder;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.data.redis.RedisConnectionFailureException;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.ParticipantJoined;
import com.cephadex.ambi.session.event.ParticipantLeft;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.SessionRoster;
import com.cephadex.ambi.session.redis.PresenceStore;

/**
 * Participant admission and departure invariants across Mongo, the atomic
 * roster, presence, compensating rollback, and published deltas.
 */
class SessionParticipantServiceTest {

    private static final String SESSION_ID = "session-1";
    private static final String PUBLIC_ID = "public-1";

    private LiveSessionRepository sessions;
    private ParticipantRepository participants;
    private SessionRoster roster;
    private PresenceStore presenceStore;
    private EventPublisher publisher;
    private SessionParticipantService service;

    @BeforeEach
    void setUp() {
        sessions = mock(LiveSessionRepository.class);
        participants = mock(ParticipantRepository.class);
        roster = mock(SessionRoster.class);
        presenceStore = mock(PresenceStore.class);
        publisher = mock(EventPublisher.class);
        service = new SessionParticipantService(sessions, participants, roster, presenceStore, publisher);
    }

    @Test
    void joinInsertsParticipantSeedsPresenceAndPublishesTheDelta() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenReturn(true);

        SessionParticipantService.JoinResult result = service.join("ROOM", "user-9", "Niner", null, null);

        // The participant carries the session link, so the join is a plain insert —
        // written twice, bracketing the admit: the document first so the announced
        // join is loadable, then the admission marker that puts it on the roster.
        ArgumentCaptor<Participant> saved = ArgumentCaptor.forClass(Participant.class);
        verify(participants, times(2)).save(saved.capture());
        assertThat(saved.getValue().getSessionId()).isEqualTo(SESSION_ID);
        assertThat(saved.getValue().isAdmitted()).isTrue();
        InOrder writes = inOrder(participants, roster);
        writes.verify(participants).save(any(Participant.class));
        writes.verify(roster).admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any());
        writes.verify(participants).save(any(Participant.class));
        verify(presenceStore).save(eq(SESSION_ID), eq(result.participant().getParticipantId()), any());

        // The delta carries only the new player — never a roster snapshot.
        ArgumentCaptor<SessionEvent> event = ArgumentCaptor.forClass(SessionEvent.class);
        verify(roster).admit(eq(SESSION_ID), eq(PUBLIC_ID), eq(result.participant().getParticipantId()),
                anyInt(), event.capture());
        assertThat(event.getValue()).isInstanceOfSatisfying(ParticipantJoined.class,
                joined -> assertThat(joined.participant().participantId())
                        .isEqualTo(result.participant().getParticipantId()));
    }

    @Test
    void joinStampsTheAdmittedMarkerOnlyAfterTheRosterAdmits() {
        joinableSession();
        AtomicReference<Participant> inserted = new AtomicReference<>();
        when(participants.save(any(Participant.class))).thenAnswer(save -> {
            inserted.compareAndSet(null, save.getArgument(0));
            return save.getArgument(0);
        });
        // The two saves capture the same mutated instance, so a captor cannot show
        // when the marker landed — the admit itself has to assert it.
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenAnswer(admit -> {
            assertThat(inserted.get()).isNotNull();
            // Until the admit returns, the document is durable but not a member: no
            // rehydrate may seed a joiner this call is still free to refuse.
            assertThat(inserted.get().isAdmitted()).isFalse();
            return true;
        });

        service.join("ROOM", "user-9", "Niner", null, null);

        assertThat(inserted.get().isAdmitted()).isTrue();
    }

    @Test
    void joinRollsBackWhenTheAdmittedStampFails() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenReturn(true);
        // The insert lands, the admit lands — and the write that would make the
        // membership durable does not.
        DataAccessResourceFailureException stampFailure = new DataAccessResourceFailureException("mongo is down");
        when(participants.save(any(Participant.class)))
                .thenAnswer(save -> save.getArgument(0))
                .thenThrow(stampFailure);

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isSameAs(stampFailure);
        // Here the member really is in the set and the join really was published, so
        // both halves of the rollback are load-bearing.
        InOrder rollback = inOrder(participants, roster);
        rollback.verify(participants).delete(any(Participant.class));
        rollback.verify(roster).remove(eq(SESSION_ID), anyString());
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    /**
     * The join path takes no session lock and writes nothing on the session
     * document — that is what lets concurrent joins all succeed instead of racing
     * for the fail-fast lock and 409-ing with SESSION_LOCKED.
     */
    @Test
    void joinWritesNoSessionDocument() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenReturn(true);

        service.join("ROOM", "user-9", "Niner", null, null);

        verify(repo, never()).save(any());
    }

    @Test
    void joinRejectsWhenRosterAtCapAndUndoesTheInsert() {
        Deck deck = mock(Deck.class);
        when(deck.getSettings()).thenReturn(new Settings.DeckSettings(null, null,
                new Settings.AudienceSettings(2, false, false, false, false, false, true), null));
        when(joinableSession().getDeck()).thenReturn(deck);
        // The cap is enforced inside the roster's atomic admit script, which reports
        // a full session by refusing to add.
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), eq(2), any())).thenReturn(false);

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("participant limit");
        // The speculative insert is rolled back rather than left orphaned, and the
        // roster member goes with it. Document first: a rehydrate racing the rollback
        // then reads Mongo after the delete and can't re-seed the id the SREM drops.
        InOrder rollback = inOrder(participants, roster);
        rollback.verify(participants).delete(any(Participant.class));
        rollback.verify(roster).remove(eq(SESSION_ID), anyString());
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void joinRollsTheRosterBackWhenTheAdmitScriptBlowsUp() {
        joinableSession();
        // A connection failure reading the reply can leave the member added and the
        // join published, so the rollback has to drop it from the set too.
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any()))
                .thenThrow(new IllegalStateException("no reply"));

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOf(IllegalStateException.class);
        InOrder rollback = inOrder(participants, roster);
        rollback.verify(participants).delete(any(Participant.class));
        rollback.verify(roster).remove(eq(SESSION_ID), anyString());
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void aRosterRollbackThatFailsDoesNotMaskWhyTheJoinFailed() {
        joinableSession();
        IllegalStateException admitFailure = new IllegalStateException("no reply");
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenThrow(admitFailure);
        // The compensating SREM is only needed when Redis is misbehaving — which is
        // exactly when it fails too, so it must not become the exception the caller
        // sees (and must not skip the rethrow).
        doThrow(new RedisConnectionFailureException("redis is down"))
                .when(roster).remove(eq(SESSION_ID), anyString());

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isSameAs(admitFailure)
                .satisfies(thrown -> assertThat(thrown.getSuppressed())
                        .singleElement().isInstanceOf(RedisConnectionFailureException.class));
        // The document still goes, so nothing is orphaned by the failed SREM.
        verify(participants).delete(any(Participant.class));
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void aRosterRollbackThatFailsStillReportsTheFullSession() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenReturn(false);
        doThrow(new RedisConnectionFailureException("redis is down"))
                .when(roster).remove(eq(SESSION_ID), anyString());

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOfSatisfying(ConflictException.class,
                        full -> assertThat(full.getCode()).isEqualTo("SESSION_FULL"))
                .satisfies(thrown -> assertThat(thrown.getSuppressed())
                        .singleElement().isInstanceOf(RedisConnectionFailureException.class));
        verify(participants).delete(any(Participant.class));
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void aDocumentRollbackThatFailsDoesNotMaskWhyTheJoinFailed() {
        joinableSession();
        IllegalStateException admitFailure = new IllegalStateException("no reply");
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenThrow(admitFailure);
        // A Mongo failure undoing the speculative insert must not become the exception
        // the caller sees either — it would replace the reason the join was refused.
        doThrow(new DataAccessResourceFailureException("mongo is down"))
                .when(participants).delete(any(Participant.class));

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isSameAs(admitFailure)
                .satisfies(thrown -> assertThat(thrown.getSuppressed())
                        .singleElement().isInstanceOf(DataAccessResourceFailureException.class));
        // The SREM still runs. The orphaned document inflates nothing on its own (it
        // never gained an admission marker, so no roster read sees it), but a member
        // left in the set would inflate the cap for the set's whole TTL.
        verify(roster).remove(eq(SESSION_ID), anyString());
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void aDocumentRollbackThatFailsStillReportsTheFullSession() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), anyInt(), any())).thenReturn(false);
        doThrow(new DataAccessResourceFailureException("mongo is down"))
                .when(participants).delete(any(Participant.class));

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOfSatisfying(ConflictException.class,
                        full -> assertThat(full.getCode()).isEqualTo("SESSION_FULL"))
                .satisfies(thrown -> assertThat(thrown.getSuppressed())
                        .singleElement().isInstanceOf(DataAccessResourceFailureException.class));
        verify(roster).remove(eq(SESSION_ID), anyString());
        verify(presenceStore, never()).save(anyString(), anyString(), any());
    }

    @Test
    void joinAppliesDefaultCapWhenDeckHasNoAudienceSettings() {
        joinableSession();
        when(roster.admit(eq(SESSION_ID), eq(PUBLIC_ID), anyString(), eq(200), any())).thenReturn(false);

        assertThatThrownBy(() -> service.join("ROOM", "user-9", "Niner", null, null))
                .isInstanceOf(ConflictException.class);
        verify(participants).delete(any(Participant.class));
        verify(roster).remove(eq(SESSION_ID), anyString());
    }

    /** A live session reachable by room code, with nothing roster-related stubbed. */
    private LiveSession joinableSession() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(false);
        when(session.getId()).thenReturn(SESSION_ID);
        when(session.getPublicId()).thenReturn(PUBLIC_ID);
        when(sessions.findByRoomCode("ROOM")).thenReturn(Optional.of(session));
        when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(session));
        return session;
    }

    @Test
    void joinUnknownRoomCodeIsNotFound() {
        when(sessions.findByRoomCode("NOPE")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.join("NOPE", "u", "n", null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void joinTerminalSessionIsNotFound() {
        LiveSession session = mock(LiveSession.class);
        when(session.isTerminal()).thenReturn(true);
        when(sessions.findByRoomCode("DEAD")).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.join("DEAD", "u", "n", null, null))
                .isInstanceOf(NotFoundException.class);
    }

    @Test
    void leaveRemovesParticipantStampsDepartureAndPublishesTheDelta() {
        Participant leaver = Participant.join("user-2", "Two", null, null);
        leaver.joinSession(SESSION_ID);
        when(participants.findById(leaver.getParticipantId())).thenReturn(Optional.of(leaver));
        LiveSession session = mock(LiveSession.class);
        when(session.isHost(leaver.getParticipantId())).thenReturn(false);
        when(session.getPublicId()).thenReturn(PUBLIC_ID);
        when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(session));

        service.leave(SESSION_ID, leaver.getParticipantId());

        verify(roster).remove(SESSION_ID, leaver.getParticipantId());
        verify(presenceStore).remove(SESSION_ID, leaver.getParticipantId());
        // Durable too: the Redis set is a cache, so a rehydrate must not resurrect them.
        assertThat(leaver.isOnRoster()).isFalse();
        verify(participants).save(leaver);
        ParticipantLeft event = (ParticipantLeft) publishedEvent();
        assertThat(event.participantId()).isEqualTo(leaver.getParticipantId());
    }

    @Test
    void hostCannotLeave() {
        LiveSession session = mock(LiveSession.class);
        when(session.isHost("host")).thenReturn(true);
        when(sessions.findById(SESSION_ID)).thenReturn(Optional.of(session));

        assertThatThrownBy(() -> service.leave(SESSION_ID, "host")).isInstanceOf(ConflictException.class);
        verify(roster, never()).remove(anyString(), anyString());
    }

    private SessionEvent publishedEvent() {
        ArgumentCaptor<SessionEvent> event = ArgumentCaptor.forClass(SessionEvent.class);
        verify(publisher).publish(eq(PUBLIC_ID), event.capture());
        return event.getValue();
    }
}

