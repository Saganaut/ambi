package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.RankItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Drag-to-rank slide. Items are shown shuffled; players arrange them.
 *
 * <p>
 * Runtime answer: ordered {@code List<String>} of item ids, top → bottom.
 *
 * @param items        the items to rank, displayed in shuffled order
 * @param correctOrder item ids in the correct order, top → bottom
 * @param scoreMode    {@code EXACT} (full order only) or {@code PARTIAL}
 *                     (per-position points)
 */
public record RankingContent(
        @Schema(requiredMode = REQUIRED) int pointValue,
        @Schema(requiredMode = REQUIRED) Difficulty difficulty,
        String explanation,
        @Schema(requiredMode = REQUIRED) List<RankItem> items,
        @Schema(requiredMode = REQUIRED) List<String> correctOrder,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode,
        @Schema(requiredMode = REQUIRED) boolean allowAnonymous) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.RANKING;
    }
}
