package com.cephadex.ambi.slide.content;

import com.cephadex.ambi.slide.enums.SlideType;

public record MediaContent() implements NonScorableContent

{
    @Override
    public SlideType contentType() {

        return SlideType.MEDIA;

    }
}
