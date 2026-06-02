package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ ScorableContent base).
 *   List<RankItem> items;         // {id, label, image?} — shown shuffled
 *   List<String>   correctOrder;  // item ids, top → bottom
 *   ScoreMode      scoreMode;     // EXACT | PARTIAL (per-position / kendall-tau)
 * Answer: ordered List<String> of item ids.
 */
public record RankingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.RANKING;
    }
}
