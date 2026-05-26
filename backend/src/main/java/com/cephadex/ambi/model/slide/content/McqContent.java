package com.cephadex.ambi.model.slide.content;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.model.enums.slide.Difficulty;
import com.cephadex.ambi.model.enums.slide.SlideType;
import com.cephadex.ambi.model.slide.content.parts.McqOption;

public record McqContent(
        List<McqOption> options,
        Set<String> correctOptionIds,
        int pointValue,
        Difficulty difficulty,
        String explanation,
        boolean shuffle,
        int maxSelections

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MCQ;
    }
}
