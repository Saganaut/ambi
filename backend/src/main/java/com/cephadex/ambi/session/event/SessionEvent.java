package com.cephadex.ambi.session.event;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Anything broadcast to a live session's subscribers (host + players) over the
 * per-session STOMP topic. A sealed hierarchy of immutable records, each already
 * <strong>participant-safe</strong>: participants are referenced by
 * {@code participantId} (never {@code userId}), and no payload carries an answer
 * key, speaker notes, or other authoring secrets — that stripping happens in
 * {@code SessionEvents} when the event is built.
 *
 * <p>Polymorphism uses the shared {@code @JsonTypeInfo}/{@code @JsonSubTypes}
 * annotations ({@code com.fasterxml.jackson.annotation}, common to both Jackson
 * majors) with a {@code "type"} discriminator, resolved by Jackson 3 in both
 * {@code RedisJsonCodec} (the mapper these events round-trip through on the Redis
 * fan-out hop) and the configured STOMP message converter. The discriminator name
 * is the simple class name, so a client switches on {@code event.type}. Frontend note: these
 * payloads are not part of the OpenAPI schema, so the union is typed by hand on
 * the client.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "type")
@JsonSubTypes({
        @JsonSubTypes.Type(value = LiveSessionStarted.class, name = "LiveSessionStarted"),
        @JsonSubTypes.Type(value = ParticipantJoined.class, name = "ParticipantJoined"),
        @JsonSubTypes.Type(value = ParticipantLeft.class, name = "ParticipantLeft"),
        @JsonSubTypes.Type(value = ParticipantReconnected.class, name = "ParticipantReconnected"),
        @JsonSubTypes.Type(value = ParticipantRemoved.class, name = "ParticipantRemoved"),
        @JsonSubTypes.Type(value = PresenceChanged.class, name = "PresenceChanged"),
        @JsonSubTypes.Type(value = RoundStarted.class, name = "RoundStarted"),
        @JsonSubTypes.Type(value = LiveResultsShown.class, name = "LiveResultsShown"),
        @JsonSubTypes.Type(value = TallyUpdated.class, name = "TallyUpdated"),
        @JsonSubTypes.Type(value = QAndAUpdated.class, name = "QAndAUpdated"),
        @JsonSubTypes.Type(value = SubmissionsLocked.class, name = "SubmissionsLocked"),
        @JsonSubTypes.Type(value = VotingOpened.class, name = "VotingOpened"),
        @JsonSubTypes.Type(value = VoteCast.class, name = "VoteCast"),
        @JsonSubTypes.Type(value = ResponsesRevealed.class, name = "ResponsesRevealed"),
        @JsonSubTypes.Type(value = ResultsRevealed.class, name = "ResultsRevealed"),
        @JsonSubTypes.Type(value = RoundRestarted.class, name = "RoundRestarted"),
        @JsonSubTypes.Type(value = TimerPaused.class, name = "TimerPaused"),
        @JsonSubTypes.Type(value = TimerResumed.class, name = "TimerResumed"),
        @JsonSubTypes.Type(value = LiveSessionEnded.class, name = "LiveSessionEnded"),
        @JsonSubTypes.Type(value = LiveSessionCancelled.class, name = "LiveSessionCancelled")
})
public sealed interface SessionEvent
        permits LiveSessionStarted, ParticipantJoined, ParticipantLeft, ParticipantReconnected, ParticipantRemoved,
        PresenceChanged, RoundStarted, LiveResultsShown, TallyUpdated, QAndAUpdated, SubmissionsLocked,
        VotingOpened, VoteCast, ResponsesRevealed, ResultsRevealed, RoundRestarted, TimerPaused, TimerResumed,
        LiveSessionEnded, LiveSessionCancelled {

    /**
     * This event type's static {@link SessionEventKind classification}. Nothing
     * branches on it today — it exists so the deferred durable event log has a
     * persistence filter that is decided per type, at compile time, rather than
     * by a hand-maintained list somewhere downstream (see
     * {@code z-docs/features/live-session-events.md} §"Deferred: durable event
     * log").
     *
     * <p>The switch is exhaustive over the permitted types <strong>with no
     * {@code default} branch on purpose</strong>: adding a twenty-first event
     * type is a compile error here until it has been classified.
     */
    default SessionEventKind kind() {
        return switch (this) {
            // Superseded state replacements: only the newest value matters.
            case TallyUpdated _ -> SessionEventKind.EPHEMERAL;
            case VoteCast _ -> SessionEventKind.EPHEMERAL;
            case PresenceChanged _ -> SessionEventKind.EPHEMERAL;
            case QAndAUpdated _ -> SessionEventKind.EPHEMERAL;
            // Session/round transitions: each occurrence is a step in the history.
            case LiveSessionStarted _ -> SessionEventKind.LIFECYCLE;
            case LiveSessionEnded _ -> SessionEventKind.LIFECYCLE;
            case LiveSessionCancelled _ -> SessionEventKind.LIFECYCLE;
            case ParticipantJoined _ -> SessionEventKind.LIFECYCLE;
            case ParticipantLeft _ -> SessionEventKind.LIFECYCLE;
            case ParticipantReconnected _ -> SessionEventKind.LIFECYCLE;
            case ParticipantRemoved _ -> SessionEventKind.LIFECYCLE;
            case RoundStarted _ -> SessionEventKind.LIFECYCLE;
            case RoundRestarted _ -> SessionEventKind.LIFECYCLE;
            case LiveResultsShown _ -> SessionEventKind.LIFECYCLE;
            case SubmissionsLocked _ -> SessionEventKind.LIFECYCLE;
            case VotingOpened _ -> SessionEventKind.LIFECYCLE;
            case ResponsesRevealed _ -> SessionEventKind.LIFECYCLE;
            case ResultsRevealed _ -> SessionEventKind.LIFECYCLE;
            case TimerPaused _ -> SessionEventKind.LIFECYCLE;
            case TimerResumed _ -> SessionEventKind.LIFECYCLE;
        };
    }
}
