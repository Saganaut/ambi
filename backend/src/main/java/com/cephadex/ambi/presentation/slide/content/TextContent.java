package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape (+ pointValue/difficulty/explanation from ScorableContent).
 * Covers short-answer and word cloud (see SlideType note).
 *   Set<String> acceptedAnswers;       // any match = correct; empty = unscored / wordcloud
 *   MatchMode   matchMode;             // EXACT | CONTAINS | WORDCLOUD
 *   boolean     caseSensitive, trimWhitespace;
 *   Integer     maxLength;
 * Answer: String.
 */
public record TextContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TEXT;
    }
}
