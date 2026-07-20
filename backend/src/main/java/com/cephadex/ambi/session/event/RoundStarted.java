package com.cephadex.ambi.session.event;

import java.time.Instant;

import com.cephadex.ambi.session.event.dto.SlideView;

/**
 * A round opened for submissions on {@code slideId} in the hidden
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#SUBMIT SUBMIT}
 * phase — nothing is shown to participants yet. Carries the participant-safe
 * {@link SlideView} (answer key stripped) and the start time used for response
 * timing. {@code deadline} is the server-authoritative auto-close instant for a
 * timed round (ADR 002), {@code null} for an untimed one — clients render their
 * countdown from it rather than re-deriving it locally. A round that opens live
 * instead emits {@link LiveResultsShown}.
 */
public record RoundStarted(String slideId, SlideView slide, Instant roundStartedAt, Instant deadline)
        implements SessionEvent {
}
