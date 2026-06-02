package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — freehand drawing, typically scored
 * by Best-Answer voting rather than a fixed key.
 *   String    prompt;
 *   int       canvasWidth, canvasHeight;
 *   Integer   timeLimitSeconds;
 *   Set<Tool> tools;  // PEN | ERASER | SHAPES | TEXT
 * Answer: serialized strokes (JSON) or rendered image S3 key.
 */
public record DrawingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.DRAWING;
    }
}
