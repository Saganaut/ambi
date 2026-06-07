package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Slider slide — players drag one or more items to a position on a scale.
 *
 * <p>
 * Runtime answer: {@code Map<String, Double>} (itemId → value).
 *
 * @param min           left-most value of the scale
 * @param max           right-most value of the scale
 * @param step          snap increment (e.g. {@code 1.0}, {@code 0.5})
 * @param leftLabel     label rendered at the left end of the slider
 * @param rightLabel    label rendered at the right end of the slider
 * @param items         items players must position; single-item lists show one
 *                      handle
 * @param correctValues target position per item (itemId → value)
 * @param tolerance     ± margin around each target that counts as correct
 */
public record ScalesContent(
        @Schema(requiredMode = REQUIRED) double min,
        @Schema(requiredMode = REQUIRED) double max,
        @Schema(requiredMode = REQUIRED) double step,
        @Schema(requiredMode = REQUIRED) String leftLabel,
        @Schema(requiredMode = REQUIRED) String rightLabel,
        @Schema(requiredMode = REQUIRED) List<ScaleItem> items,
        @Schema(requiredMode = REQUIRED) Map<String, Double> correctValues,
        @Schema(requiredMode = REQUIRED) double tolerance

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.SCALES;
    }
}
