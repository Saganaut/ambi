package com.cephadex.ambi.presentation.slide.content;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "contentType")
@JsonSubTypes({
                @JsonSubTypes.Type(value = TitleContent.class),
                @JsonSubTypes.Type(value = MediaContent.class),
                @JsonSubTypes.Type(value = QAndAContent.class)

})

// TODO: Media isn't a great name we ll need to update this later when we have a
// better idea of
// the different types of non scorable slides we ll have
public sealed interface NonScorableContent extends SlideContent permits TitleContent, MediaContent, QAndAContent {

}
