package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** The participant's response to a follow-up prompt. */
public record FollowUpAnswer(String text) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.FOLLOW_UP;
    }
}
