package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Free-form 2D placement slide — players drag items anywhere on an X × Y plane
 * whose axes carry low/high endpoint labels. The continuous counterpart of
 * {@link GridContent}: placements land at arbitrary normalized coordinates and
 * are graded by distance to an author-set target within {@code tolerance}.
 *
 * <p>
 * Runtime answer: {@code Map<String, AxisPoint>} (itemId → placement).
 *
 * @param xLowLabel        label at the low end of the X axis
 * @param xHighLabel       label at the high end of the X axis
 * @param yLowLabel        label at the low end of the Y axis
 * @param yHighLabel       label at the high end of the Y axis
 * @param items            the items players place; displayed in a shuffled bank
 * @param correctPositions target point per item (itemId → point) — the answer
 *                         key, never sent to clients; empty = collect-only
 * @param tolerance        normalized radius around each target that counts as
 *                         correct, one knob per slide
 * @param scoreMode        {@code INSIDE_RADIUS} (every keyed item within
 *                         tolerance); fixed — the editor never writes it
 */
public record AxisContent(
        @Schema(requiredMode = REQUIRED) String xLowLabel,
        @Schema(requiredMode = REQUIRED) String xHighLabel,
        @Schema(requiredMode = REQUIRED) String yLowLabel,
        @Schema(requiredMode = REQUIRED) String yHighLabel,
        @Schema(requiredMode = REQUIRED) List<AxisItem> items,
        @Schema(requiredMode = REQUIRED) Map<String, AxisPoint> correctPositions,
        @Schema(requiredMode = REQUIRED) double tolerance,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.AXIS;
    }
}
