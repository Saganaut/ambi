package com.cephadex.ambi.session.event.dto;

import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;

/**
 * The participant-safe slice of a Place-on-image slide's content carried on
 * {@link SlideView}: the backing image players drop their pin on.
 *
 * <p><strong>Never carries {@code correctTargets}</strong> — those are the
 * answer key (the authored target circles, their locations, and radii).
 * They are disclosed only at results reveal, via
 * {@link com.cephadex.ambi.session.event.ResultsRevealed#placeTargets()}.
 *
 * <p>The backing image travels as a pre-resolved {@code imageUrl} string rather
 * than an {@code AppImage}, for the reasons documented on
 * {@link MatchingConfigView}: the STOMP and Redis fan-out mappers don't run the
 * HTTP-side presigning serializer, so an embedded {@code AppImage} would leak
 * raw S3 keys on the event path. It is resolved at the same board tier as
 * {@link DrawingConfigView#imagePromptUrl()} — the closest analog, a single
 * slide-level backdrop rather than a card face — through the shared
 * {@code imageUrl} resolver passed to {@link SlideView#from}; pin coordinates
 * are normalized, so display resolution is cosmetic (a dedicated larger tier is
 * a possible follow-up if projected-board crispness demands it).
 */
public record PlaceOnImageConfigView(String imageUrl) {

    /**
     * Builds the view; {@code imageUrl} resolves the backing {@link AppImage} to
     * a renderable URL (or null when it carries nothing renderable).
     */
    public static PlaceOnImageConfigView from(PlaceOnImageContent content, Function<AppImage, String> imageUrl) {
        return new PlaceOnImageConfigView(imageUrl.apply(content.image()));
    }
}
