package com.cephadex.ambi.presentation.slide.content;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Drag-to-rank slide. Items are shown shuffled; players arrange them.
 *
 * <p>Runtime answer: ordered {@code List<String>} of item ids, top → bottom.
 *
 * @param items        the items to rank, displayed in shuffled order
 * @param correctOrder item ids in the correct order, top → bottom
 * @param scoreMode    {@code EXACT} (full order only) or {@code PARTIAL} (per-position points)
 */
public record RankingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        List<RankItem> items,
        List<String> correctOrder,
        ScoreMode scoreMode
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.RANKING;
    }
}
