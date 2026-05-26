package com.cephadex.ambi.model.slide.content;

import com.cephadex.ambi.model.enums.slide.Difficulty;
import com.cephadex.ambi.model.enums.slide.SlideType;

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
