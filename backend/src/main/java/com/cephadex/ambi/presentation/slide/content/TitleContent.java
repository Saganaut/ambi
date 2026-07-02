package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * A non-scorable "title" slide — a large, centred title used to open a deck or a
 * section. The headline itself is the slide's {@code title} (shared by every
 * slide, see {@link com.cephadex.ambi.presentation.slide.Slide}); this record
 * adds only an optional {@code subtitle} shown beneath it.
 *
 * @param subtitle optional secondary line rendered under the title; {@code null}
 *                 when absent
 */
public record TitleContent(String subtitle) implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TITLE;
    }
}
