package com.cephadex.ambi.presentation.slide.content;

import java.util.List;
import java.util.Set;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import io.swagger.v3.oas.annotations.media.Schema;
import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

/**
 * Multiple-choice question — just the choices and the correct-answer key.
 * {@code shuffle}/{@code maxSelections} now live on the slide's answer settings;
 * {@code pointValue}/{@code allowAnonymous} on its settings and
 * {@code difficulty}/{@code explanation} on the slide itself.
 */
public record McqContent(
        @Schema(requiredMode = REQUIRED) List<McqOption> options,
        @Schema(requiredMode = REQUIRED) Set<String> correctOptionIds

) implements ScorableContent {
    @Override
    public SlideType contentType() {
        return SlideType.MCQ;
    }
}
