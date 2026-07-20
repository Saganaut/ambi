package com.cephadex.ambi.session.event;

import java.time.Instant;
import java.util.Map;

import com.cephadex.ambi.session.event.dto.SlideView;

/**
 * The round entered
 * {@link com.cephadex.ambi.session.liveSession.enums.RoundPhase#SUBMIT_LIVE
 * SUBMIT_LIVE}: submissions are still open while the live response distribution is
 * shown (never the answer key). Fired either as the opening event of a round whose
 * slide uses {@code ResultsDisplayMode.IMMEDIATE}, or when the host turns results
 * live mid-round. {@code slide} is the {@link SlideView} when this is the opening
 * event (the first event a client sees for the slide) and {@code null} on the
 * mid-round toggle, where the client already has it from the prior
 * {@link RoundStarted}. Carries the current {@code optionCounts}, which keep
 * updating via {@link TallyUpdated}. {@code deadline} is the auto-close instant
 * for a timed round (ADR 002), {@code null} for an untimed one.
 */
public record LiveResultsShown(String slideId, SlideView slide, Instant roundStartedAt,
        Map<String, Integer> optionCounts, Instant deadline) implements SessionEvent {
}
