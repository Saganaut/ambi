package com.cephadex.ambi.presentation.slide.content;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchItem;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Match-the-pairs slide — players draw connections from left items to right items.
 *
 * <p>Runtime answer: {@code Map<String, String>} (leftId → rightId).
 *
 * @param left         items shown on the left column
 * @param right        items shown on the right column
 * @param correctPairs the correct pairing (leftId → rightId)
 * @param scoreMode    {@code EXACT} (all pairs correct only) or {@code PARTIAL} (per-pair points)
 */
public record MatchingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        List<MatchItem> left,
        List<MatchItem> right,
        Map<String, String> correctPairs,
        ScoreMode scoreMode
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MATCHING;
    }
}
