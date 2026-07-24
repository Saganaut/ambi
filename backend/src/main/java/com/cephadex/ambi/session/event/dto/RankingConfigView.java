package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.RankingContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;

/**
 * The participant-safe slice of a Ranking slide's content carried on
 * {@link SlideView}: the item bank to arrange.
 *
 * <p><strong>Never carries {@code correctOrder}</strong> — that is the answer
 * key — <strong>nor {@code scoreMode}</strong>: the view ships to participants
 * when the round opens, and neither the right order nor how it grades is theirs
 * to see.
 *
 * <p>Item images travel as pre-resolved {@code imageUrl} strings rather than
 * {@code AppImage} objects, for the reasons documented on
 * {@link MatchingConfigView}: the STOMP and Redis fan-out mappers don't run
 * the HTTP-side presigning serializer, so an embedded {@code AppImage} would
 * leak raw S3 keys on the event path.
 */
public record RankingConfigView(List<RankItemView> items) {

    /**
     * One rankable item: the id orderings are keyed by, its label, its
     * pre-resolved image URL (null for a text-only item), and its authored
     * accent color override (null → the board falls back to the shared option
     * palette).
     */
    public record RankItemView(String id, String label, String imageUrl, String color) {
    }

    /**
     * Builds the view; {@code imageUrl} resolves an item's {@link AppImage} to
     * a renderable URL (or null when it carries nothing renderable).
     */
    public static RankingConfigView from(RankingContent content, Function<AppImage, String> imageUrl) {
        List<RankItemView> items = content.items() == null ? List.of()
                : content.items().stream()
                        .map((RankItem item) -> new RankItemView(
                                item.id(), item.label(), imageUrl.apply(item.image()), item.color()))
                        .toList();
        return new RankingConfigView(items);
    }
}
