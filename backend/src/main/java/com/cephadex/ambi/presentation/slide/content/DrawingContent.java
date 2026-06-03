package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
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
 * @param prompt           text question shown above the canvas
 * @param imagePrompt      optional reference image shown alongside the canvas
 * @param canvasWidth      canvas width in logical pixels
 * @param canvasHeight     canvas height in logical pixels
 * @param timeLimitSeconds optional drawing time cap; {@code null} = unlimited
 * @param tools            drawing tools available to players
 */
public record DrawingContent(
        @Schema(requiredMode = REQUIRED) int pointValue,
        @Schema(requiredMode = REQUIRED) Difficulty difficulty,
        String explanation,
        AppImage imagePrompt,
        AppImage correctImage, // can be used to compare with participants drawings
        @Schema(requiredMode = REQUIRED) int canvasWidth,
        @Schema(requiredMode = REQUIRED) int canvasHeight,
        @Schema(requiredMode = REQUIRED) Set<Tool> tools,
        @Schema(requiredMode = REQUIRED) boolean allowAnonymous) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.DRAWING;
    }
}
