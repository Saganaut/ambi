package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Points the participant allocated to each option id. */
public record AllocationAnswer(Map<String, Integer> allocations) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.ALLOCATION;
    }
}
