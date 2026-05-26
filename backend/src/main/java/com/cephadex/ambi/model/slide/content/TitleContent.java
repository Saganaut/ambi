package com.cephadex.ambi.model.slide.content;

import com.cephadex.ambi.model.enums.slide.SlideType;

public record TitleContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TITLE;
    }
}
