package com.cephadex.ambi.presentation.slide.content;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "contentType")
@JsonSubTypes({
                @JsonSubTypes.Type(value = TitleContent.class),
                @JsonSubTypes.Type(value = RichTextContent.class),
                @JsonSubTypes.Type(value = MediaContent.class),
                @JsonSubTypes.Type(value = InstructionContent.class),
                @JsonSubTypes.Type(value = QAndAContent.class)

})
public sealed interface NonScorableContent extends SlideContent
                permits TitleContent, RichTextContent, MediaContent, InstructionContent, QAndAContent {

}
