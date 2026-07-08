package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScaleItem;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Slider slide — players rate one or more statements by dragging a marker
 * anywhere along a continuous left↔right scale. The 1-D counterpart of
 * {@link AxisContent}: positions land at arbitrary points on the track and are
 * graded by distance to an author-set target within {@code tolerance}.
 *
 * <p>
 * Runtime answer: {@code Map<String, Double>} (statementId → normalized track
 * position in {@code [0, 1]}, 0 = left end). Graders denormalize with
 * {@code min + p · (max − min)} before comparing against the answer key.
 *
 * @param min           left-end value of the scale
 * @param max           right-end value of the scale
 * @param leftLabel     label rendered at the left end of the slider
 * @param rightLabel    label rendered at the right end of the slider
 * @param items         statements players rate on the scale
 * @param correctValues target per statement (statementId → value, in scale
 *                      units) — the answer key, never sent to clients; empty =
 *                      collect-only
 * @param tolerance     ± margin in scale units around each target that counts
 *                      as correct (the editor keeps it within 2–50 % of the
 *                      span {@code max − min})
 */
public record ScalesContent(
        @Schema(requiredMode = REQUIRED) double min,
        @Schema(requiredMode = REQUIRED) double max,
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
