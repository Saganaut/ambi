package com.cephadex.ambi.presentation.deck.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.common.validation.ValidationConstants;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;

/**
 * The destination for a slide move: its target position in the deck's order.
 * The backend computes the new {@code sortOrder} key from this index, so the
 * client only sends where to drop the slide, never a key. An out-of-range index
 * is clamped server-side.
 *
 * @param to the zero-based target position among the deck's slides
 */
public record MoveSlideRequest(
        @Schema(requiredMode = REQUIRED) @Min(ValidationConstants.SLIDE_INDEX_MIN) int to) {
}
