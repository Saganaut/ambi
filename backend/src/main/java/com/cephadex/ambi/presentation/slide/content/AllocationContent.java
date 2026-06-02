package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base) — split a fixed budget across options.
 *   List<AllocOption>   options;            // {id, label}
 *   int                 total;              // e.g. 100 points/tokens
 *   Map<String,Integer> correctAllocation;  // optionId → amount
 *   int                 tolerance;          // ± per option
 *   ScoreMode           scoreMode;          // EXACT | PROPORTIONAL
 * Answer: Map<String,Integer> summing to total.
 */
public record AllocationContent(
        int pointValue,
        Difficulty difficulty,
        String explanation) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.ALLOCATION;
    }
}
