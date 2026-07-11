package com.cephadex.ambi.session.event.dto;

import java.util.List;
import java.util.Set;
import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.presentation.slide.enums.Tool;

/**
 * The participant-safe slice of a Drawing slide's content carried on
 * {@link SlideView}: everything the player canvas needs — the optional prompt
 * image (and where to show it), the stroke palette, and the enabled tools.
 *
 * <p><strong>Never carries {@code correctImage}</strong> — that is reference
 * material for grading/comparison, not for players.
 *
 * <p>The prompt image travels as a pre-resolved {@code imagePromptUrl} string
 * rather than an {@code AppImage}, for the reasons documented on
 * {@link MatchingConfigView}: the STOMP and Redis fan-out mappers don't run
 * the HTTP-side presigning serializer, so an embedded {@code AppImage} would
 * leak raw S3 keys on the event path.
 */
public record DrawingConfigView(
        String imagePromptUrl,
        PromptPlacement promptPlacement,
        List<String> palette,
        Set<Tool> tools) {

    /**
     * Builds the view; {@code imageUrl} resolves the prompt {@link AppImage} to
     * a renderable URL (or null when it carries nothing renderable).
     */
    public static DrawingConfigView from(DrawingContent content, Function<AppImage, String> imageUrl) {
        return new DrawingConfigView(
                imageUrl.apply(content.imagePrompt()),
                content.promptPlacement(),
                content.palette() == null ? List.of() : List.copyOf(content.palette()),
                content.tools() == null ? Set.of() : Set.copyOf(content.tools()));
    }
}
