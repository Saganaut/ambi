package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "contentType")
@JsonSubTypes({
                @JsonSubTypes.Type(value = McqContent.class),
                @JsonSubTypes.Type(value = NumberContent.class),
                @JsonSubTypes.Type(value = TextContent.class),
                @JsonSubTypes.Type(value = RankingContent.class),
                @JsonSubTypes.Type(value = ScalesContent.class),
                @JsonSubTypes.Type(value = GridContent.class),
                @JsonSubTypes.Type(value = PlaceOnImageContent.class),
                @JsonSubTypes.Type(value = MatchingContent.class),
                @JsonSubTypes.Type(value = FollowUpContent.class),
                @JsonSubTypes.Type(value = DrawingContent.class),
                @JsonSubTypes.Type(value = AllocationContent.class)

})
public sealed interface ScorableContent extends SlideContent
                permits McqContent, NumberContent, TextContent,
                RankingContent, ScalesContent, GridContent, PlaceOnImageContent, MatchingContent, FollowUpContent,
                AllocationContent, DrawingContent {

        int pointValue();

        Difficulty difficulty();

        String explanation();

}