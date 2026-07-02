package com.cephadex.ambi.presentation.slide.content.parts.block;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

import io.swagger.v3.oas.annotations.media.DiscriminatorMapping;
import io.swagger.v3.oas.annotations.media.Schema;

/**
 * One unit of presentational body content on a non-scorable "content" slide
 * (see {@link com.cephadex.ambi.presentation.slide.content.TitleContent}). A
 * slide's body is an ordered {@code List<SlideBlock>}; each block is a typed,
 * self-contained piece — a heading, a paragraph, a bullet list, an image, or a
 * callout — that the author adds and reorders, PowerPoint-style.
 *
 * <p>Polymorphic exactly like {@link com.cephadex.ambi.presentation.slide.content.SlideContent}:
 * discriminated by {@code kind} on the wire (Jackson) and mirrored into the
 * OpenAPI spec (the {@code @Schema} below) so the generated client sees a real
 * discriminated union. {@code OpenApiConfig.flattenPolymorphicUnions} is generic
 * and flattens this union with no extra wiring.
 *
 * <p>Adding a block kind: a {@code @JsonSubTypes.Type} entry here plus a matching
 * {@code oneOf}/{@link DiscriminatorMapping} entry on the schema below.
 */
@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, include = JsonTypeInfo.As.PROPERTY, property = "kind")
@JsonSubTypes({
                @JsonSubTypes.Type(value = HeadingBlock.class,    name = "HeadingBlock"),
                @JsonSubTypes.Type(value = BodyBlock.class,       name = "BodyBlock"),
                @JsonSubTypes.Type(value = BulletListBlock.class, name = "BulletListBlock"),
                @JsonSubTypes.Type(value = ImageBlock.class,      name = "ImageBlock"),
                @JsonSubTypes.Type(value = CalloutBlock.class,    name = "CalloutBlock")
})
@Schema(
                description = "A single content-slide body block, discriminated by `kind`.",
                discriminatorProperty = "kind",
                oneOf = {
                                HeadingBlock.class,
                                BodyBlock.class,
                                BulletListBlock.class,
                                ImageBlock.class,
                                CalloutBlock.class
                },
                discriminatorMapping = {
                                @DiscriminatorMapping(value = "HeadingBlock",    schema = HeadingBlock.class),
                                @DiscriminatorMapping(value = "BodyBlock",       schema = BodyBlock.class),
                                @DiscriminatorMapping(value = "BulletListBlock", schema = BulletListBlock.class),
                                @DiscriminatorMapping(value = "ImageBlock",      schema = ImageBlock.class),
                                @DiscriminatorMapping(value = "CalloutBlock",    schema = CalloutBlock.class)
                })
public sealed interface SlideBlock
                permits HeadingBlock, BodyBlock, BulletListBlock, ImageBlock, CalloutBlock {

        /** Client-minted stable id, used as the React key and for reorder/remove. */
        String id();

}
