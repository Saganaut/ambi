package com.cephadex.ambi.presentation.slide.content;

import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Short-answer or word-cloud slide. Both modes share this record; the
 * distinction is {@code matchMode == WORDCLOUD} with an empty
 * {@code acceptedAnswers} set (unscored display).
 *
 * <p>Runtime answer: free-text {@code String} per player.
 *
 * @param acceptedAnswers any matching answer is correct; empty = unscored / word-cloud
 * @param matchMode       how player answers are compared to {@code acceptedAnswers}
 * @param caseSensitive   when {@code false} comparison is case-insensitive
 * @param trimWhitespace  strip leading/trailing whitespace before comparison
 * @param maxLength       optional character cap on player input; {@code null} = unlimited
 */
public record TextContent(
        int pointValue,
        Difficulty difficulty,
        String explanation,
        Set<String> acceptedAnswers,
        MatchMode matchMode,
        boolean caseSensitive,
        boolean trimWhitespace,
        Integer maxLength
) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TEXT;
    }
}
