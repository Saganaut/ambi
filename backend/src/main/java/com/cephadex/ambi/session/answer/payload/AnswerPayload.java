package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "answerType")
@JsonSubTypes({
        @JsonSubTypes.Type(value = McqAnswer.class),
        @JsonSubTypes.Type(value = NumberAnswer.class),
        @JsonSubTypes.Type(value = TextAnswer.class),
        @JsonSubTypes.Type(value = RankingAnswer.class),
        @JsonSubTypes.Type(value = ScalesAnswer.class),
        @JsonSubTypes.Type(value = QAndAAnswer.class),
        @JsonSubTypes.Type(value = QAndAQuestions.class),
        @JsonSubTypes.Type(value = MatchingAnswer.class),
        @JsonSubTypes.Type(value = GridAnswer.class),
        @JsonSubTypes.Type(value = AxisAnswer.class),
        @JsonSubTypes.Type(value = PlaceOnImageAnswer.class),
        @JsonSubTypes.Type(value = AllocationAnswer.class),
        @JsonSubTypes.Type(value = DrawingAnswer.class),
        @JsonSubTypes.Type(value = FollowUpAnswer.class)
})
public sealed interface AnswerPayload
        permits McqAnswer, NumberAnswer, TextAnswer, RankingAnswer, ScalesAnswer,
        QAndAAnswer, QAndAQuestions, MatchingAnswer, GridAnswer, AxisAnswer, PlaceOnImageAnswer,
        AllocationAnswer, DrawingAnswer, FollowUpAnswer {

    /** The slide type this payload answers. */
    SlideType slideType();

}
