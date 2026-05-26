package com.cephadex.ambi.model.slide.content;

import com.cephadex.ambi.model.enums.slide.Difficulty;
import com.cephadex.ambi.model.enums.slide.SlideType;

public record MatchingContent(
        int pointValue,
        Difficulty difficulty,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MATCHING;
    }
}
