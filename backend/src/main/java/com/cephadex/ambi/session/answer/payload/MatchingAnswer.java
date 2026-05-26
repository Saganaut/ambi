package com.cephadex.ambi.session.answer.payload;

import java.util.Map;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** Pairings chosen by the participant, mapping each left item id to a right item id. */
public record MatchingAnswer(Map<String, String> matches) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.MATCHING;
    }
}
