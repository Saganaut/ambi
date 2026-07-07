package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.AxisContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisItem;

/**
 * The participant-safe slice of an Axis slide's content carried on
 * {@link SlideView}: the endpoint labels and the items to place.
 *
 * <p><strong>Never carries {@code correctPositions} or {@code tolerance}</strong>
 * — the positions are the answer key, and the tolerance is grading-only
 * knowledge pre-reveal. Item images don't exist on {@code AxisItem} yet (a
 * named follow-up, same presigned-URL story as grid item images), so an item
 * travels as id + label only.
 */
public record AxisConfigView(
        String xLowLabel,
        String xHighLabel,
        String yLowLabel,
        String yHighLabel,
        List<AxisItemView> items) {

    /** One placeable item: the id placements are keyed by, and its label. */
    public record AxisItemView(String id, String label) {
    }

    public static AxisConfigView from(AxisContent content) {
        List<AxisItemView> items = content.items() == null ? List.of()
                : content.items().stream()
                        .map((AxisItem item) -> new AxisItemView(item.id(), item.label()))
                        .toList();
        return new AxisConfigView(
                content.xLowLabel(),
                content.xHighLabel(),
                content.yLowLabel(),
                content.yHighLabel(),
                items);
    }
}
