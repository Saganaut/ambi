package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** The participant's drawing, as serialized image data (e.g. a data URL). */
public record DrawingAnswer(String imageData) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.DRAWING;
    }
}
