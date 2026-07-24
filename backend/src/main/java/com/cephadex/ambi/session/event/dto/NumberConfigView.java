package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.presentation.slide.content.NumberContent;

/**
 * The participant-safe slice of a Number slide's content carried on
 * {@link SlideView}: the display bounds the board uses to size the numeric input
 * and scale the results distribution, plus the optional unit suffix.
 *
 * <p><strong>Never carries {@code answer}, {@code scoreMode}, or
 * {@code tolerance}</strong> — the answer is the key, and the mode/tolerance are
 * grading-only knowledge that would let a client reverse-engineer the accepted
 * range pre-reveal (the same reason Scales drops its tolerance). The correct
 * value, when the slide defines one, is disclosed only at reveal via the round
 * result's {@code correctOption}. {@code min}/{@code max}/{@code unit} are all
 * {@code null} when the author left them unbounded / unset.
 */
public record NumberConfigView(
        Double min,
        Double max,
        String unit) {

    public static NumberConfigView from(NumberContent content) {
        return new NumberConfigView(
                content.min() == null ? null : content.min().doubleValue(),
                content.max() == null ? null : content.max().doubleValue(),
                content.unit());
    }
}
