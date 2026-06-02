package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — place item(s) on a slider.
 *   double             min, max, step;
 *   String             leftLabel, rightLabel;
 *   List<ScaleItem>    items;          // {id, label} to position
 *   Map<String,Double> correctValues;  // itemId → target
 *   double             tolerance;
 * Answer: Map<String,Double> (itemId → value).
 */
public record ScalesContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.SCALES;
    }
}
