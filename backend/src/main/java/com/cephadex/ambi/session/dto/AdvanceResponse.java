package com.cephadex.ambi.session.dto;

/**
 * Result of a host {@code advance}: the slide the new round opened on, or a
 * terminal marker when the deck snapshot is exhausted — the cue for the final
 * podium. When {@code terminal} is {@code true} no round was opened and
 * {@code slideId} is {@code null}.
 */
public record AdvanceResponse(String slideId, boolean terminal) {

    public static AdvanceResponse opened(String slideId) {
        return new AdvanceResponse(slideId, false);
    }

    public static AdvanceResponse exhausted() {
        return new AdvanceResponse(null, true);
    }
}
