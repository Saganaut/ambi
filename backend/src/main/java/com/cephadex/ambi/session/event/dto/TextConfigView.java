package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.presentation.slide.content.TextContent;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.MatchMode;

/**
 * The participant-safe slice of a Text slide's content carried on
 * {@link SlideView}: the optional input cap so the client can stop accepting
 * characters at the limit, and a {@code wordCloud} display hint so the board
 * knows to render the word-cloud affordance rather than a scored short-answer
 * box.
 *
 * <p><strong>Never carries {@code acceptedAnswers}, {@code matchMode} itself,
 * {@code caseSensitive}, or {@code trimWhitespace}</strong> — the accepted
 * answers are the answer key, and the match/normalization settings are
 * grading-only knowledge that would let a client reverse-engineer what counts
 * as correct pre-reveal. Only the {@code WORDCLOUD} distinction leaks, as the
 * boolean the board needs to pick its layout.
 */
public record TextConfigView(
        Integer maxLength,
        boolean wordCloud) {

    public static TextConfigView from(TextContent content) {
        return new TextConfigView(content.maxLength(), content.matchMode() == MatchMode.WORDCLOUD);
    }
}
