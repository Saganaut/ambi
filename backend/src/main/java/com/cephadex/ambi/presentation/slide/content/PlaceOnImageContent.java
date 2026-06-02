package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — pin point(s) on an image.
 *   AppImage     image;
 *   List<Target> targets;    // {id, x, y, radius} normalized 0..1
 *   ScoreMode    scoreMode;  // INSIDE_RADIUS | NEAREST | DISTANCE
 * Answer: List<Point> {x, y} (normalized).
 */
public record PlaceOnImageContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
