package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Normalized (0..1) coordinates of the pin the participant placed on the image. */
public record PlaceOnImageAnswer(double x, double y) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
