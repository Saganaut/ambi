package com.cephadex.ambi.presentation.slide.content;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

public record McqContent(
        @Schema(requiredMode = REQUIRED) List<McqOption> options,
        @Schema(requiredMode = REQUIRED) Set<String> correctOptionIds,
        @Schema(requiredMode = REQUIRED) int pointValue,
        @Schema(requiredMode = REQUIRED) Difficulty difficulty,
        String explanation,
        @Schema(requiredMode = REQUIRED) boolean shuffle,
        @Schema(requiredMode = REQUIRED) int maxSelections,
        @Schema(requiredMode = REQUIRED) boolean allowAnonymous

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MCQ;
    }
}
