package com.cephadex.ambi.presentation.slide.content;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.McqOption;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

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
