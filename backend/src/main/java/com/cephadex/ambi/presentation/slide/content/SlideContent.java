package com.cephadex.ambi.presentation.slide.content;

import com.cephadex.ambi.presentation.slide.enums.SlideType;
import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * Polymorphic slide body, discriminated by {@code contentType} (the slide's
 * {@link SlideType}). Jackson carries the discriminator on the wire; the
 * {@link Schema} below mirrors it into the OpenAPI spec so the generated client
 * sees a real discriminated union rather than a loose bag of optionals.
 *
 * <p>Only {@code MCQ} is wired in for now. Each new content type is added in one
 * place per layer: a {@code @JsonSubTypes.Type} entry (here and on the matching
 * {@link ScorableContent}/{@link NonScorableContent} sub-interface) plus a
 * {@code oneOf}/{@link DiscriminatorMapping} entry on the schema below.
 */
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
@Schema(
                description = "Slide body, discriminated by `contentType`.",
                discriminatorProperty = "contentType",
                oneOf = { McqContent.class },
                discriminatorMapping = {
                                @DiscriminatorMapping(value = "MCQ", schema = McqContent.class)
                })
public sealed interface SlideContent
                permits NonScorableContent, ScorableContent {

        SlideType contentType();

}