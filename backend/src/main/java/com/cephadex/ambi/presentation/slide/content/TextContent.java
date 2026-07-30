package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Short-answer or word-cloud slide. Both modes share this record; the
 * distinction is {@code matchMode == WORDCLOUD} with an empty
 * {@code acceptedAnswers} set (unscored display).
 *
 * <p>
 * Runtime answer: free-text {@code String} per player.
 *
 * @param acceptedAnswers any matching answer is correct; empty = unscored /
 *                        word-cloud
 * @param matchMode       how player answers are compared to
 *                        {@code acceptedAnswers}
 * @param caseSensitive   when {@code false} comparison is case-insensitive
 * @param trimWhitespace  strip leading/trailing whitespace before comparison
 * @param maxLength       optional character cap on player input; {@code null} =
 *                        unlimited
 */
public record TextContent(
        @Schema(requiredMode = REQUIRED) Set<String> acceptedAnswers,
        @Schema(requiredMode = REQUIRED) MatchMode matchMode,
        @Schema(requiredMode = REQUIRED) boolean caseSensitive,
        @Schema(requiredMode = REQUIRED) boolean trimWhitespace,
        Integer maxLength) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TEXT;
    }

    /**
     * {@code text} reduced to the form this slide compares on, per its own
     * {@code trimWhitespace}/{@code caseSensitive} settings. Applied to both
     * sides of a comparison (grading a submission against
     * {@code acceptedAnswers}, or grouping submissions that count as the same
     * answer), so "what settings does this slide consider equal?" is answered in
     * one place.
     *
     * @return the normalized form, or {@code null} for {@code null} input
     */
    public String normalize(String text) {
        if (text == null) {
            return null;
        }
        String normalized = trimWhitespace ? text.strip() : text;
        return caseSensitive ? normalized : normalized.toLowerCase();
    }
}
