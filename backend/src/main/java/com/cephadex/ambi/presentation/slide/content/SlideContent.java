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
 * <p>Each new content type is added in one place per layer: a
 * {@code @JsonSubTypes.Type} entry here, a matching entry on
 * {@link ScorableContent} or {@link NonScorableContent}, and a
 * {@code oneOf}/{@link DiscriminatorMapping} entry on the schema below.
 *
 * <p>The raw SpringDoc output for this {@code @JsonTypeInfo} hierarchy is a
 * circular {@code oneOf}/{@code allOf} pair; {@code OpenApiConfig} flattens it into
 * a clean discriminated union before the client is generated.
 */
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
                @JsonSubTypes.Type(value = AllocationContent.class),
                @JsonSubTypes.Type(value = DrawingContent.class),
                @JsonSubTypes.Type(value = FollowUpContent.class),
                @JsonSubTypes.Type(value = TitleContent.class),
                @JsonSubTypes.Type(value = MediaContent.class),
                @JsonSubTypes.Type(value = QAndAContent.class)
})
@Schema(
                description = "Slide body, discriminated by `contentType`.",
                discriminatorProperty = "contentType",
                oneOf = {
                                McqContent.class,
                                NumberContent.class,
                                TextContent.class,
                                RankingContent.class,
                                ScalesContent.class,
                                GridContent.class,
                                PlaceOnImageContent.class,
                                MatchingContent.class,
                                AllocationContent.class,
                                DrawingContent.class,
                                FollowUpContent.class,
                                TitleContent.class,
                                MediaContent.class,
                                QAndAContent.class
                },
                discriminatorMapping = {
                                @DiscriminatorMapping(value = "MCQ",            schema = McqContent.class),
                                @DiscriminatorMapping(value = "NUMBER",         schema = NumberContent.class),
                                @DiscriminatorMapping(value = "TEXT",           schema = TextContent.class),
                                @DiscriminatorMapping(value = "RANKING",        schema = RankingContent.class),
                                @DiscriminatorMapping(value = "SCALES",         schema = ScalesContent.class),
                                @DiscriminatorMapping(value = "GRID",           schema = GridContent.class),
                                @DiscriminatorMapping(value = "PLACE_ON_IMAGE", schema = PlaceOnImageContent.class),
                                @DiscriminatorMapping(value = "MATCHING",       schema = MatchingContent.class),
                                @DiscriminatorMapping(value = "ALLOCATION",     schema = AllocationContent.class),
                                @DiscriminatorMapping(value = "DRAWING",        schema = DrawingContent.class),
                                @DiscriminatorMapping(value = "FOLLOW_UP",      schema = FollowUpContent.class),
                                @DiscriminatorMapping(value = "TITLE",          schema = TitleContent.class),
                                @DiscriminatorMapping(value = "MEDIA",          schema = MediaContent.class),
                                @DiscriminatorMapping(value = "Q_AND_A",        schema = QAndAContent.class)
                })
public sealed interface SlideContent
                permits NonScorableContent, ScorableContent {

        SlideType contentType();

}