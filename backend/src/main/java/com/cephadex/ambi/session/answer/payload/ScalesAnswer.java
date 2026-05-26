package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Rating chosen for each statement, keyed by statement id. */
public record ScalesAnswer(Map<String, Integer> ratings) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.SCALES;
    }
}
