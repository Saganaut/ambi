package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * A non-scorable "content" slide — a single block of rich text (HTML from the
 * editor's rich-text input). This is the plain "PowerPoint body" slide: no
 * answer, no scoring, just formatted prose. A richer editing surface is a
 * planned follow-up; the stored shape stays a single HTML {@code body} string.
 *
 * <p>Its discriminator is {@code CONTENT} (see {@link SlideContent}); the record
 * is named {@code RichTextContent} to describe what it holds, exactly as
 * {@code McqContent} backs the {@code MCQ} discriminator.
 *
 * @param body rich-text (HTML) body; {@code null}/empty for a blank slide
 */
public record RichTextContent(String body) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.CONTENT;
    }
}
