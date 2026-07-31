package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.PromptPlacement;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.presentation.slide.enums.Tool;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Freehand drawing slide. Typically scored by best-answer voting rather than
 * a fixed correct answer. The canvas is always a fixed 1:1 square; its
 * logical resolution is a client-side constant.
 *
 * <p>
 * Runtime answer: rendered PNG stored in S3 (see DrawingAnswer).
 *
 * @param imagePrompt     optional prompt image shown with the canvas
 * @param promptPlacement whether the prompt image sits beside the canvas or
 *                        under the strokes as a traceable background
 * @param correctImage    the author's own correct answer to this prompt, as a
 *                        picture. Optional, and it changes nothing about the
 *                        Drawing round itself — its one consumer is a
 *                        {@code SPOT_THE_ANSWER} follow-up, which seeds it onto
 *                        the board among the participants' drawings for the room
 *                        to spot (see {@code FollowUpOptions.withAuthoredImage}).
 *                        Carrying one is what makes this slide an eligible
 *                        parent for that mode ({@code DeckService.hasAnswerKey}).
 *                        It is <strong>never</strong> on the participant wire:
 *                        {@link com.cephadex.ambi.session.event.dto.DrawingConfigView}
 *                        deliberately omits it, and on the follow-up board it
 *                        travels only as an opaque candidate image URL,
 *                        indistinguishable from a submitted one.
 * @param palette         author-configured stroke colors offered to players
 * @param tools           drawing tools available to players
 */
public record DrawingContent(
        AppImage imagePrompt,
        @Schema(requiredMode = REQUIRED) PromptPlacement promptPlacement,
        AppImage correctImage,
        @Schema(requiredMode = REQUIRED) List<String> palette,
        @Schema(requiredMode = REQUIRED) Set<Tool> tools) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.DRAWING;
    }
}
