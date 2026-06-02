package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape — display-only media (no answer, no scoring).
 *   MediaType mediaType;          // IMAGE | VIDEO | EMBED
 *   AppImage  image;              // when IMAGE (else Slide.backgroundImage)
 *   String    url;                // video / embed source
 *   String    caption;
 *   boolean   autoplay, loop, muted;
 * Name is a placeholder — see TODO on NonScorableContent.
 */
public record MediaContent() implements NonScorableContent

{
    @Override
    public SlideType contentType() {

        return SlideType.MEDIA;

    }
}
