package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base).
 *   BigDecimal answer;     // target value
 *   ScoreMode  scoreMode;  // EXACT | RANGE | CLOSEST
 *   BigDecimal tolerance;  // ± for RANGE
 *   String     unit;       // display suffix, e.g. "km"
 *   BigDecimal min, max;   // optional input bounds
 * Answer: BigDecimal.
 */
public record NumberContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.NUMBER;
    }
}
