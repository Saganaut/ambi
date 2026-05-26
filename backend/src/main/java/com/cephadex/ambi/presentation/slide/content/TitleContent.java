package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

public record TitleContent() implements NonScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.TITLE;
    }
}
