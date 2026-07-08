package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Normalized track position per statement (statementId → [0, 1]), 0 = left end. */
public record ScalesAnswer(Map<String, Double> positions) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.SCALES;
    }
}
