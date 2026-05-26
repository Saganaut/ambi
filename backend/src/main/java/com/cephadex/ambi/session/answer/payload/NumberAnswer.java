package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

public record NumberAnswer(double value) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.NUMBER;
    }
}
