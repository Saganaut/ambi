package com.cephadex.ambi.session.event;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.Arrays;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.session.event.dto.ParticipantView;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.participant.enums.RemovalReason;

/**
 * Pins the static lifecycle/ephemeral classification every {@link SessionEvent}
 * type carries — the filter the deferred durable event log will persist on.
 * {@link #everyPermittedEventTypeIsCovered()} keeps this file exhaustive: a
 * twenty-first event type fails here as well as at the compile-time switch in
 * {@link SessionEvent#kind()}.
 */
class SessionEventKindTest {

    private static final Instant AT = Instant.parse("2026-07-01T10:00:00Z");

    /** One instance of each permitted event type; payloads are irrelevant here. */
    private static final List<SessionEvent> ALL = List.of(
            new LiveSessionStarted(LiveSessionLifecycle.IN_PROGRESS, RoundPhase.SUBMIT),
            new ParticipantJoined(participant()),
            new ParticipantLeft("p-1"),
            new ParticipantReconnected(participant()),
            new ParticipantRemoved("p-1", RemovalReason.KICKED, List.of()),
            new PresenceChanged("p-1", ConnectionStatus.ONLINE, AT),
            new RoundStarted("slide-1", null, AT, null),
            new LiveResultsShown("slide-1", null, AT, Map.of(), null),
            new TallyUpdated("slide-1", Map.of()),
            new QAndAUpdated("slide-1", List.of()),
            new SubmissionsLocked("slide-1"),
            new VotingOpened("slide-1", List.of()),
            new VoteCast("slide-1", 1),
            new ResponsesRevealed("slide-1", Map.of()),
            new ResultsRevealed("slide-1", List.of(), Map.of(), null, List.of(), null, null, null, false),
            new RoundRestarted("slide-1", RoundPhase.SUBMIT, AT, null),
            new TimerPaused("slide-1", AT, null),
            new TimerResumed("slide-1", null),
            new LiveSessionEnded(List.of()),
            new LiveSessionCancelled("host left"));

    @Test
    void everyPermittedEventTypeIsCovered() {
        List<String> permitted = Arrays.stream(SessionEvent.class.getPermittedSubclasses())
                .map(type -> type.getSimpleName())
                .toList();

        assertThat(ALL).extracting(event -> event.getClass().getSimpleName())
                .containsExactlyInAnyOrderElementsOf(permitted);
    }

    @Test
    void supersededStateReplacementsAreEphemeral() {
        assertThat(kindsOf(SessionEventKind.EPHEMERAL))
                .containsExactlyInAnyOrder("TallyUpdated", "VoteCast", "PresenceChanged", "QAndAUpdated");
    }

    @Test
    void everyTransitionEventIsLifecycle() {
        assertThat(kindsOf(SessionEventKind.LIFECYCLE))
                .containsExactlyInAnyOrder("LiveSessionStarted", "ParticipantJoined", "ParticipantLeft",
                        "ParticipantReconnected", "ParticipantRemoved", "RoundStarted", "LiveResultsShown",
                        "SubmissionsLocked", "VotingOpened", "ResponsesRevealed", "ResultsRevealed",
                        "RoundRestarted", "TimerPaused", "TimerResumed", "LiveSessionEnded",
                        "LiveSessionCancelled");
    }

    // ── helpers ──

    private static List<String> kindsOf(SessionEventKind kind) {
        return ALL.stream()
                .filter(event -> event.kind() == kind)
                .map(event -> event.getClass().getSimpleName())
                .toList();
    }

    private static ParticipantView participant() {
        return new ParticipantView("p-1", "Player", null, null, ConnectionStatus.ONLINE, null);
    }
}
