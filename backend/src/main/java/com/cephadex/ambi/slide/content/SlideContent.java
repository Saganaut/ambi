package com.cephadex.ambi.slide.content;

import com.cephadex.ambi.slide.enums.SlideType;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "contentType")
@JsonSubTypes({
                @JsonSubTypes.Type(value = McqContent.class),
                @JsonSubTypes.Type(value = ScorableContent.class),
                @JsonSubTypes.Type(value = NonScorableContent.class),
// @JsonSubTypes.Type(value = RankingContent.class),
// @JsonSubTypes.Type(value = ScalesContent.class),
// @JsonSubTypes.Type(value = QAndAContent.class),
// @JsonSubTypes.Type(value = GridContent.class),
// @JsonSubTypes.Type(value = PlaceOnImageContent.class),
// @JsonSubTypes.Type(value = AllocationContent.class),
// @JsonSubTypes.Type(value = MatchingContent.class),
// @JsonSubTypes.Type(value = DrawingContent.class)
})
public sealed interface SlideContent
                permits NonScorableContent, ScorableContent {

        SlideType contentType();

}