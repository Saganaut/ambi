package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Match-the-pairs slide — players draw connections from left items to right
 * items.
 *
 * <p>
 * Runtime answer: {@code Map<String, String>} (leftId → rightId).
 *
 * @param left         items shown on the left column
 * @param right        items shown on the right column
 * @param correctPairs the correct pairing (leftId → rightId)
 * @param scoreMode    {@code EXACT} (all pairs correct only) or {@code PARTIAL}
 *                     (per-pair points)
 */
public record MatchingContent(
        @Schema(requiredMode = REQUIRED) List<MatchItem> left,
        @Schema(requiredMode = REQUIRED) List<MatchItem> right,
        @Schema(requiredMode = REQUIRED) Map<String, String> correctPairs,
        @Schema(requiredMode = REQUIRED) ScoreMode scoreMode) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MATCHING;
    }
}
