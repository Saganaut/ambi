package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/*
 * Proposed shape — pure presentation framing (no answer, no scoring).
 * Title/subtitle text + images already live on Slide.
 *   String  subtitle;      // optional kicker under the title
 *   Layout  layout;        // CENTERED | LEFT | SPLIT
 *   boolean showOnAgenda;  // include in section/agenda nav
 * Often genuinely empty — most title slides need nothing here.
 */
public record TitleContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TITLE;
    }
}
