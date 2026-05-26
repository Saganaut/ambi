package com.cephadex.ambi.session.answer.payload;

import java.util.Set;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

public record McqAnswer(Set<String> optionIds) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.MCQ;
    }
}
