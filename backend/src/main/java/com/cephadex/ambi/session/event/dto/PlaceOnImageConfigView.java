package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.Target;

/**
 * The participant-safe slice of a Place-on-image slide's content carried on
 * {@link SlideView}: the backing image players drop their pins on, and the list
 * of items to place (one pin per item).
 *
 * <p><strong>Never carries the targets' geometry</strong> — {@code x},
 * {@code y}, and {@code radius} are the answer key (where each item's pin must
 * land). {@link #items()} projects only the participant-facing annotations
 * (id / label / image / color) off {@code correctTargets}; the geometry is
 * disclosed only at results reveal, via
 * {@link com.cephadex.ambi.session.event.ResultsRevealed#placeTargets()}.
 *
 * <p>The backing image and each item's image travel as pre-resolved
 * {@code imageUrl} strings rather than {@code AppImage} objects, for the reasons
 * documented on {@link MatchingConfigView}: the STOMP and Redis fan-out mappers
 * don't run the HTTP-side presigning serializer, so an embedded {@code AppImage}
 * would leak raw S3 keys on the event path. The backing image resolves at the
 * same board tier as {@link DrawingConfigView#imagePromptUrl()} — the closest
 * analog, a single slide-level backdrop rather than a card face — through the
 * shared {@code imageUrl} resolver passed to {@link SlideView#from}; pin
 * coordinates are normalized, so display resolution is cosmetic (a dedicated
 * larger tier is a possible follow-up if projected-board crispness demands it).
 */
public record PlaceOnImageConfigView(String imageUrl, List<PlaceItemView> items) {

    /**
     * One placeable item: the id placements are keyed by, its label, its
     * pre-resolved image URL (null for a text-only item), and its authored
     * accent color override (null → the board falls back to the shared option
     * palette). Deliberately carries no coordinates — those are the answer key.
     */
    public record PlaceItemView(String id, String label, String imageUrl, String color) {
    }

    /**
     * Builds the view; {@code imageUrl} resolves the backing {@link AppImage}
     * and each item's {@link AppImage} to a renderable URL (or null when it
     * carries nothing renderable).
     */
    public static PlaceOnImageConfigView from(PlaceOnImageContent content, Function<AppImage, String> imageUrl) {
        List<PlaceItemView> items = content.correctTargets() == null ? List.of()
                : content.correctTargets().stream()
                        .map((Target target) -> new PlaceItemView(
                                target.id(), target.label(), imageUrl.apply(target.image()), target.color()))
                        .toList();
        return new PlaceOnImageConfigView(imageUrl.apply(content.image()), items);
    }
}
