package com.cephadex.ambi.model.slide.content;

import com.cephadex.ambi.model.enums.slide.Difficulty;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "contentType")
@JsonSubTypes({
        @JsonSubTypes.Type(value = McqContent.class)

})
public sealed interface ScorableContent extends SlideContent permits McqContent {

    int pointValue();

    Difficulty difficulty();

    String explanation();

}