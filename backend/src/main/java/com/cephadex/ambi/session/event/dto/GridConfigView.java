package com.cephadex.ambi.session.event.dto;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;

/**
 * The participant-safe slice of a Grid slide's content carried on
 * {@link SlideView}: the matrix labels and the items to place.
 *
 * <p><strong>Never carries {@code correctCells}</strong> — that is the answer
 * key. Per-item images are also dropped for now (deferred with the
 * presigned-image-over-STOMP work), so an item travels as id + label only.
 */
public record GridConfigView(
        List<String> rowLabels,
        List<String> colLabels,
        List<GridItemView> items) {

    /** One placeable item: the id placements are keyed by, and its label. */
    public record GridItemView(String id, String label) {
    }

    public static GridConfigView from(GridContent content) {
        List<GridItemView> items = content.items() == null ? List.of()
                : content.items().stream()
                        .map((GridItem item) -> new GridItemView(item.id(), item.label()))
                        .toList();
        return new GridConfigView(
                content.rowLabels() == null ? List.of() : List.copyOf(content.rowLabels()),
                content.colLabels() == null ? List.of() : List.copyOf(content.colLabels()),
                items);
    }
}
