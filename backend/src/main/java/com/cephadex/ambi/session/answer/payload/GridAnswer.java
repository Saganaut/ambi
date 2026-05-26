package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Placement of each item id into a grid cell id. */
public record GridAnswer(Map<String, String> placements) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.GRID;
    }
}
