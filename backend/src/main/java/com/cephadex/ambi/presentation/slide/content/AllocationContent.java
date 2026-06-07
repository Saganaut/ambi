package com.cephadex.ambi.presentation.slide.content;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.*;

import java.util.List;
import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;

public record AllocationContent(
        @Schema(requiredMode = REQUIRED) List<McqOption> options,
        Map<String, Integer> correctAllocations, // String the id of the correct option
        @Schema(requiredMode = REQUIRED) int totalPointsToAllocate,
        @Schema(requiredMode = REQUIRED) int tolerancePerOption

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.ALLOCATION;
    }
}
