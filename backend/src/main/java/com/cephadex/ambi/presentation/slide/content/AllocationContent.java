package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOptionId;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

public record AllocationContent(
        @Schema(requiredMode = REQUIRED) int pointValue,
        @Schema(requiredMode = REQUIRED) Difficulty difficulty,
        @Schema(requiredMode = REQUIRED) List<McqOption> options,
        Map<McqOptionId, Integer> correctAllocations, // not necessary if not scorable
        @Schema(requiredMode = REQUIRED) int totalPointsToAllocate,
        @Schema(requiredMode = REQUIRED) int tolerancePerOption,
        @Schema(requiredMode = REQUIRED) boolean allowAnonymous,
        String explanation

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.ALLOCATION;
    }
}
