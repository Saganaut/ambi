package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.presentation.slide.enums.Tool;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Freehand drawing slide. Typically scored by best-answer voting rather than
 * a fixed correct answer.
 *
 * <p>
 * Runtime answer: serialized strokes (JSON) or rendered image S3 key.
 *
 * @param imagePrompt      optional reference image shown alongside the canvas
 * @param correctImage     optional reference image to compare against drawings
 * @param canvasWidth      canvas width in logical pixels
 * @param canvasHeight     canvas height in logical pixels
 * @param tools            drawing tools available to players
 */
public record DrawingContent(
        AppImage imagePrompt,
        AppImage correctImage, // can be used to compare with participants drawings
        @Schema(requiredMode = REQUIRED) int canvasWidth,
        @Schema(requiredMode = REQUIRED) int canvasHeight,
        @Schema(requiredMode = REQUIRED) Set<Tool> tools) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.DRAWING;
    }
}
