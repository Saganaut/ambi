package com.cephadex.ambi.presentation.slide.content;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

/**
 * Marker for slide content that produces a score during a session. The
 * cross-cutting authoring fields that used to live here — {@code pointValue},
 * {@code difficulty}, {@code explanation}, {@code allowAnonymous} — have moved
 * off content: scoring/answer knobs now live on the slide's
 * {@link com.cephadex.ambi.presentation.deck.Settings.SlideSettings} (with deck
 * defaults), and {@code difficulty}/{@code explanation} are top-level fields on
 * {@link com.cephadex.ambi.presentation.slide.Slide}. Content itself is now just
 * the question shape: the options/items plus the correct-answer key.
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
                @JsonSubTypes.Type(value = FollowUpContent.class),
                @JsonSubTypes.Type(value = DrawingContent.class),
                @JsonSubTypes.Type(value = AllocationContent.class)

})
public sealed interface ScorableContent extends SlideContent
                permits McqContent, NumberContent, TextContent,
                RankingContent, ScalesContent, GridContent, PlaceOnImageContent, MatchingContent, FollowUpContent,
                AllocationContent, DrawingContent {

}
