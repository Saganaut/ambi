package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.AxisPoint;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Placement of each item id at a normalized point on the plane. */
public record AxisAnswer(Map<String, AxisPoint> placements) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.AXIS;
    }
}
