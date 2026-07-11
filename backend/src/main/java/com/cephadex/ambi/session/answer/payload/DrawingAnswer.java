package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * The participant's drawing: a rendered PNG that was ingested to S3 before
 * submission, referenced here as a stored image.
 */
public record DrawingAnswer(AppImage image) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.DRAWING;
    }
}
