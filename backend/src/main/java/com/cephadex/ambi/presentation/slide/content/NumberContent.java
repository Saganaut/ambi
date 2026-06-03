package com.cephadex.ambi.presentation.slide.content;

import java.math.BigDecimal;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Numeric answer slide.
 *
 * <p>Runtime answer: {@code BigDecimal} per player.
 *
 * @param answer    the correct target value
 * @param scoreMode {@code EXACT}, {@code RANGE} (within ± {@code tolerance}), or
 *                  {@code CLOSEST} (player nearest the answer wins)
 * @param tolerance ± margin for {@code RANGE} mode; ignored otherwise
 * @param unit      display suffix shown in the input, e.g. {@code "km"}; {@code null} = none
 * @param min       optional lower bound for the player's input; {@code null} = unbounded
 * @param max       optional upper bound for the player's input; {@code null} = unbounded
 */
public record NumberContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        BigDecimal answer,
        ScoreMode scoreMode,
        BigDecimal tolerance,
        String unit,
        BigDecimal min,
        BigDecimal max
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.NUMBER;
    }
}
