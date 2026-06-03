package com.cephadex.ambi.presentation.slide.content;

import java.util.Set;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.presentation.slide.enums.Tool;

/**
 * Freehand drawing slide. Typically scored by best-answer voting rather than
 * a fixed correct answer.
 *
 * <p>Runtime answer: serialized strokes (JSON) or rendered image S3 key.
 *
 * @param prompt           text question shown above the canvas
 * @param imagePrompt      optional reference image shown alongside the canvas
 * @param canvasWidth      canvas width in logical pixels
 * @param canvasHeight     canvas height in logical pixels
 * @param timeLimitSeconds optional drawing time cap; {@code null} = unlimited
 * @param tools            drawing tools available to players
 */
public record DrawingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        String prompt,
        AppImage imagePrompt,
        int canvasWidth,
        int canvasHeight,
        Integer timeLimitSeconds,
        Set<Tool> tools
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.DRAWING;
    }
}
