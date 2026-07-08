package com.cephadex.ambi.session.event.dto;

import java.util.Comparator;
import java.util.List;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.MatchingContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;

/**
 * The participant-safe slice of a Matching slide's content carried on
 * {@link SlideView}: the two card columns to connect, plus whether the round
 * grades at all.
 *
 * <p><strong>Never carries {@code correctPairs}</strong> — the map is the
 * answer key. The key also leaks <em>positionally</em>: the authored columns
 * are parallel arrays where {@code left[i] ↔ right[i]} is the authored pair, so
 * shipping both in authored order would hand players the identity zip. The
 * right column therefore travels <strong>re-ordered by card id</strong>: ids
 * are client-minted random nanoids, so the id order carries no trace of the
 * authored pairing, and (unlike a random shuffle) the order is deterministic —
 * a reconnecting client's snapshot rebuild shows the same board it left.
 *
 * <p>{@code scored} tells the board whether a results reveal has a
 * correct/incorrect verdict to show ({@code correctPairs} authored) or the
 * round is collect-only ({@code correctPairs} empty). It discloses only that a
 * key exists, never its content.
 *
 * <p>Card images travel as pre-resolved {@code imageUrl} strings (presigned by
 * the caller-supplied resolver at build time) rather than {@code AppImage}
 * objects: the STOMP and Redis fan-out mappers don't run the HTTP-side
 * {@code AppImage} presigning serializer, so an embedded {@code AppImage}
 * would leak raw S3 keys on the event path. A plain URL string survives every
 * hop unchanged.
 */
public record MatchingConfigView(
        List<MatchCardView> left,
        List<MatchCardView> right,
        boolean scored) {

    /**
     * One card: the id matches are keyed by, its phrase, its pre-resolved image
     * URL (null for a phrase card), and its authored accent color override
     * (null → the board falls back to the shared option palette).
     */
    public record MatchCardView(String id, String label, String imageUrl, String color) {
    }

    /**
     * Builds the view; {@code imageUrl} resolves a card's {@link AppImage} to a
     * renderable URL (or null when it carries nothing renderable).
     */
    public static MatchingConfigView from(MatchingContent content, Function<AppImage, String> imageUrl) {
        List<MatchCardView> right = cards(content.right(), imageUrl).stream()
                .sorted(Comparator.comparing((MatchCardView card) -> card.id(),
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();
        return new MatchingConfigView(
                cards(content.left(), imageUrl),
                right,
                content.correctPairs() != null && !content.correctPairs().isEmpty());
    }

    private static List<MatchCardView> cards(List<MatchItem> items, Function<AppImage, String> imageUrl) {
        return items == null ? List.of()
                : items.stream()
                        .map((MatchItem item) -> new MatchCardView(
                                item.id(), item.label(), imageUrl.apply(item.image()), item.color()))
                        .toList();
    }
}
