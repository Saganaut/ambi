package com.cephadex.ambi.session.event.dto;

import java.util.function.Function;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.McqOption;
import com.cephadex.ambi.presentation.slide.enums.McqOptionType;

/**
 * A single MCQ choice as shown to participants — id, kind, text, colour, and
 * (for an image option) its picture. It deliberately mirrors {@link McqOption}
 * and is built from the option list only, never touching
 * {@code McqContent.correctOptionIds}, so the answer key cannot leak through it.
 *
 * <p>The option image travels as a pre-resolved {@code imageUrl} string
 * (presigned by the caller-supplied resolver at build time) rather than an
 * {@code AppImage} object: the STOMP and Redis fan-out mappers don't run the
 * HTTP-side {@code AppImage} presigning serializer, so an embedded
 * {@code AppImage} would leak raw S3 keys on the event path. A plain URL string
 * survives every hop unchanged. It is {@code null} for a text/number option.
 */
public record McqOptionView(String id, McqOptionType optionType, String text, String imageUrl, String color) {

    /**
     * Projects the participant-safe fields of an authoring {@link McqOption};
     * {@code imageUrl} resolves the option's {@link AppImage} to a renderable URL
     * (or null when it carries nothing renderable).
     */
    public static McqOptionView from(McqOption option, Function<AppImage, String> imageUrl) {
        return new McqOptionView(option.id(), option.optionType(), option.text(),
                imageUrl.apply(option.image()), option.color());
    }
}
