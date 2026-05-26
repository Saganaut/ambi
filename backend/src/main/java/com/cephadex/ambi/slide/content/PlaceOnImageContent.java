package com.cephadex.ambi.slide.content;

import com.cephadex.ambi.slide.enums.Difficulty;
import com.cephadex.ambi.slide.enums.SlideType;

public record PlaceOnImageContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
