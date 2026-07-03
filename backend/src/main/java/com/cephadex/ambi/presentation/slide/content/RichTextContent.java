package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.HorizontalAlign;
import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.cephadex.ambi.presentation.slide.enums.VerticalAlign;

/**
 * A non-scorable "content" slide — a single block of rich text (HTML from the
 * editor's rich-text input). This is the plain "PowerPoint body" slide: no
 * answer, no scoring, just formatted prose.
 *
 * <p>The body is a single HTML string; {@code horizontalAlign} and
 * {@code verticalAlign} position that block as a whole within the slide's text
 * box (they are box-level, not part of the HTML). Both are {@code null} for a
 * fresh slide, where the client applies its defaults (left / top).
 *
 * <p>Its discriminator is {@code CONTENT} (see {@link SlideContent}); the record
 * is named {@code RichTextContent} to describe what it holds, exactly as
 * {@code McqContent} backs the {@code MCQ} discriminator.
 *
 * @param body            rich-text (HTML) body; {@code null}/empty for a blank slide
 * @param horizontalAlign horizontal alignment of the body block; {@code null} =
 *                        client default
 * @param verticalAlign   vertical alignment of the body block; {@code null} =
 *                        client default
 */
public record RichTextContent(
        String body, HorizontalAlign horizontalAlign, VerticalAlign verticalAlign)
        implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.CONTENT;
    }
}
