package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — pair left items to right items.
 *   List<MatchItem>    left, right;   // {id, label, image?}
 *   Map<String,String> correctPairs;  // leftId → rightId
 *   ScoreMode          scoreMode;     // EXACT | PARTIAL (per-pair)
 * Answer: Map<String,String> (leftId → rightId).
 */
public record MatchingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MATCHING;
    }
}
