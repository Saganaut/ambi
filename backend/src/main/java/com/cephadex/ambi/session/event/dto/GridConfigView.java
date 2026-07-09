package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.GridContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.GridItem;

/**
 * The participant-safe slice of a Grid slide's content carried on
 * {@link SlideView}: the matrix labels and the items to place.
 *
 * <p><strong>Never carries {@code correctCells}</strong> — that is the answer
 * key.
 *
 * <p>Item images travel as pre-resolved {@code imageUrl} strings rather than
 * {@code AppImage} objects, for the reasons documented on
 * {@link MatchingConfigView}: the STOMP and Redis fan-out mappers don't run
 * the HTTP-side presigning serializer, so an embedded {@code AppImage} would
 * leak raw S3 keys on the event path.
 */
public record GridConfigView(
        List<String> rowLabels,
        List<String> colLabels,
        List<GridItemView> items) {

    /**
     * One placeable item: the id placements are keyed by, its label, its
     * pre-resolved image URL (null for a text-only item), and its authored
     * accent color override (null → the board falls back to the shared option
     * palette).
     */
    public record GridItemView(String id, String label, String imageUrl, String color) {
    }

    /**
     * Builds the view; {@code imageUrl} resolves an item's {@link AppImage} to
     * a renderable URL (or null when it carries nothing renderable).
     */
    public static GridConfigView from(GridContent content, Function<AppImage, String> imageUrl) {
        List<GridItemView> items = content.items() == null ? List.of()
                : content.items().stream()
                        .map((GridItem item) -> new GridItemView(
                                item.id(), item.label(), imageUrl.apply(item.image()), item.color()))
                        .toList();
        return new GridConfigView(
                content.rowLabels() == null ? List.of() : List.copyOf(content.rowLabels()),
                content.colLabels() == null ? List.of() : List.copyOf(content.colLabels()),
                items);
    }
}
