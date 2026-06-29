package com.cephadex.ambi.session.event;

import java.time.Instant;

import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.dto.SlideView;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * A round opened for submissions on {@code slideId}. Carries the participant-safe
 * {@link SlideView} (answer key stripped) and the start time used for response
 * timing.
 */
public record RoundStarted(String slideId, SlideView slide, RoundPhase phase, Instant roundStartedAt)
        implements SessionEvent {
}
