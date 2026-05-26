package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** A question submitted by a participant to the Q&A slide. */
public record QAndAAnswer(String question) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.Q_AND_A;
    }
}
