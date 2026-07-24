package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.PlacePoint;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Placement of each item id at a normalized (0..1) pin on the image. */
public record PlaceOnImageAnswer(Map<String, PlacePoint> placements) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.PLACE_ON_IMAGE;
    }
}
