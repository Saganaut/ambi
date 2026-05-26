package com.cephadex.ambi.session.answer.payload;

import java.util.List;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/** The participant's ordering of the rankable item ids, best-to-worst. */
public record RankingAnswer(List<String> orderedItemIds) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.RANKING;
    }
}
