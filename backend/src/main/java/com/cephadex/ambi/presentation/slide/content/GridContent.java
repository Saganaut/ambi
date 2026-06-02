package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — drop items into a labeled matrix.
 *   List<String>       rowLabels, colLabels;
 *   List<GridItem>     items;         // {id, label, image?}
 *   Map<String,String> correctCells;  // itemId → "row,col"
 *   ScoreMode          scoreMode;     // EXACT | PARTIAL
 * Answer: Map<String,String> (itemId → cell).
 */
public record GridContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.GRID;
    }
}
