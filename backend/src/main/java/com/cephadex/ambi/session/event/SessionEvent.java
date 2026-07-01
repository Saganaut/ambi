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
        @JsonSubTypes.Type(value = SubmissionsLocked.class, name = "SubmissionsLocked"),
        @JsonSubTypes.Type(value = ResponsesRevealed.class, name = "ResponsesRevealed"),
        @JsonSubTypes.Type(value = ResultsRevealed.class, name = "ResultsRevealed"),
        @JsonSubTypes.Type(value = RoundRestarted.class, name = "RoundRestarted"),
        @JsonSubTypes.Type(value = LiveSessionEnded.class, name = "LiveSessionEnded"),
        @JsonSubTypes.Type(value = LiveSessionCancelled.class, name = "LiveSessionCancelled")
})
public sealed interface SessionEvent
        permits LiveSessionStarted, ParticipantJoined, ParticipantLeft, ParticipantReconnected, ParticipantRemoved,
        PresenceChanged, RoundStarted, LiveResultsShown, TallyUpdated, SubmissionsLocked, ResponsesRevealed,
        ResultsRevealed, RoundRestarted, LiveSessionEnded, LiveSessionCancelled {
}
