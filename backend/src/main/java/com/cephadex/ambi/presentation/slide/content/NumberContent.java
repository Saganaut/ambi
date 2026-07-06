package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.math.BigDecimal;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Numeric answer slide.
 *
 * <p>
 * Runtime answer: {@code BigDecimal} per player.
 *
 * @param answer    the correct target value, or {@code null} for an unscored
 *                  slide that only collects players' numbers (the parallel of a
 *                  {@code TextContent} with no accepted answers). A {@code null}
 *                  answer grades as never-correct regardless of {@code scoreMode}
 *                  (see {@code RoundEvaluator#gradeNumber}).
 * @param scoreMode {@code EXACT}, {@code RANGE} (within ± {@code tolerance}),
 *                  or
 *                  {@code CLOSEST} (player nearest the answer wins)
 * @param tolerance ± margin for {@code RANGE} mode; ignored otherwise
 * @param unit      display suffix shown in the input, e.g. {@code "km"};
 *                  {@code null} = none
 * @param min       optional lower bound for the player's input; {@code null} =
 *                  unbounded
 * @param max       optional upper bound for the player's input; {@code null} =
 *                  unbounded
 */
public record NumberContent(
        @Schema(nullable = true) BigDecimal answer,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode,
        @Schema(requiredMode = REQUIRED) BigDecimal tolerance,
        @Schema(requiredMode = REQUIRED) String unit,
        @Schema(requiredMode = REQUIRED) BigDecimal min, // if only one answer is acceptable set min and max to be the
                                                         // same
        @Schema(requiredMode = REQUIRED) BigDecimal max) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.NUMBER;
    }
}
