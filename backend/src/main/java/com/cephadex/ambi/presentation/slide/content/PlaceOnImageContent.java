package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlaceItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Place-on-image slide — players pin one point per item on a backing image.
 * The image-backed sibling of {@link AxisContent}: the picture stands in for
 * the labeled plane, and placements are graded by distance to an author-set
 * target within {@code tolerance}.
 *
 * <p>
 * Runtime answer: {@code Map<String, PlacePoint>} (itemId → pin).
 *
 * @param image            the backing image players pin on
 * @param items            the items players place; one pin each
 * @param correctPositions target point per item (itemId → point) — the answer
 *                         key, never sent to clients before reveal; an absent
 *                         key means that item is not graded, and an empty map
 *                         is a collect-only slide
 * @param tolerance        normalized radius around each target that counts as
 *                         correct, one knob per slide
 * @param scoreMode        {@code INSIDE_RADIUS} (every keyed item within
 *                         tolerance); fixed — the editor never writes it
 */
public record PlaceOnImageContent(
        @Schema(requiredMode = REQUIRED) AppImage image,
        @Schema(requiredMode = REQUIRED) List<PlaceItem> items,
        @Schema(requiredMode = REQUIRED) Map<String, PlacePoint> correctPositions,
        @Schema(requiredMode = REQUIRED) double tolerance,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
