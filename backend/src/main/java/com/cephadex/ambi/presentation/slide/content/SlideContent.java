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
                @JsonSubTypes.Type(value = McqContent.class,          name = "MCQ"),
                @JsonSubTypes.Type(value = NumberContent.class,        name = "NUMBER"),
                @JsonSubTypes.Type(value = TextContent.class,          name = "TEXT"),
                @JsonSubTypes.Type(value = RankingContent.class,       name = "RANKING"),
                @JsonSubTypes.Type(value = ScalesContent.class,        name = "SCALES"),
                @JsonSubTypes.Type(value = GridContent.class,          name = "GRID"),
                @JsonSubTypes.Type(value = PlaceOnImageContent.class,  name = "PLACE_ON_IMAGE"),
                @JsonSubTypes.Type(value = MatchingContent.class,      name = "MATCHING"),
                @JsonSubTypes.Type(value = AllocationContent.class,    name = "ALLOCATION"),
                @JsonSubTypes.Type(value = DrawingContent.class,       name = "DRAWING"),
                @JsonSubTypes.Type(value = FollowUpContent.class,      name = "FOLLOW_UP"),
                @JsonSubTypes.Type(value = TitleContent.class,         name = "TITLE"),
                @JsonSubTypes.Type(value = RichTextContent.class,      name = "CONTENT"),
                @JsonSubTypes.Type(value = MediaContent.class,         name = "MEDIA"),
                @JsonSubTypes.Type(value = InstructionContent.class,   name = "INSTRUCTION"),
                @JsonSubTypes.Type(value = QAndAContent.class,         name = "Q_AND_A")
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
                                RichTextContent.class,
                                MediaContent.class,
                                InstructionContent.class,
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
                                @DiscriminatorMapping(value = "CONTENT",        schema = RichTextContent.class),
                                @DiscriminatorMapping(value = "MEDIA",          schema = MediaContent.class),
                                @DiscriminatorMapping(value = "INSTRUCTION",    schema = InstructionContent.class),
                                @DiscriminatorMapping(value = "Q_AND_A",        schema = QAndAContent.class)
                })
public sealed interface SlideContent
                permits NonScorableContent, ScorableContent {

        SlideType contentType();

}