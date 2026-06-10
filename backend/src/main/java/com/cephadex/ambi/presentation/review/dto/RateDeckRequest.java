package com.cephadex.ambi.presentation.review.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Size;

/**
 * {@code PUT …/decks/{deckId}/reviews} body — submit or overwrite the caller's
 * review of a deck. A review is one star score plus an optional written note; the
 * write is an upsert keyed on {@code (deckId, userId)}, so sending it again
 * replaces the caller's existing review.
 *
 * @param stars the score, 1..5.
 * @param body  the optional written review; {@code null}/blank leaves a stars-only review.
 */
public record RateDeckRequest(
        @Min(ValidationConstants.REVIEW_STARS_MIN)
        @Max(ValidationConstants.REVIEW_STARS_MAX)
        int stars,

        @Size(max = ValidationConstants.REVIEW_BODY_MAX)
        String body) {
}
