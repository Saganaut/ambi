package com.cephadex.ambi.presentation.review.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import com.cephadex.ambi.presentation.review.DeckReviewRepositoryCustom.RatingAggregate;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The rating headline for a deck: the mean score, how many reviews it is drawn
 * from, and the per-star distribution that backs the panel's histogram.
 *
 * @param average      mean stars (1..5), {@code null} until the deck has a review.
 * @param count        total number of reviews.
 * @param distribution per-star counts, length 5: index 0 = 1★ … index 4 = 5★.
 */
public record DeckReviewSummaryResponse(
        Double average,
        @Schema(requiredMode = REQUIRED) long count,
        @Schema(requiredMode = REQUIRED) long[] distribution) {

    /** Projects a repository {@link RatingAggregate} onto its response. */
    public static DeckReviewSummaryResponse from(RatingAggregate aggregate) {
        return new DeckReviewSummaryResponse(
                aggregate.average(), aggregate.count(), aggregate.distribution());
    }
}
