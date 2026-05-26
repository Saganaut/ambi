package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Covers free-text and wordcloud submissions (wordcloud belongs to TEXT). */
public record TextAnswer(String text) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.TEXT;
    }
}
