package com.cephadex.ambi.session.event.dto;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

/**
 * A single MCQ choice as shown to participants — id, kind, text, and colour. It
 * deliberately mirrors {@link McqOption} <em>minus</em> the option image (an
 * {@code AppImage}, deferred with the rest of the presigned-image-over-STOMP
 * work). Crucially this is built from the option list only and never touches
 * {@code McqContent.correctOptionIds}, so the answer key cannot leak through it.
 */
public record McqOptionView(String id, McqOptionType optionType, String text, String color) {

    /** Projects the participant-safe fields of an authoring {@link McqOption}. */
    public static McqOptionView from(McqOption option) {
        return new McqOptionView(option.id(), option.optionType(), option.text(), option.color());
    }
}
