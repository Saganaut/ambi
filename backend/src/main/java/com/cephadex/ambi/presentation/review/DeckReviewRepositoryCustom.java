package com.cephadex.ambi.presentation.review;

/**
 * The one hand-written query Spring Data can't derive: a single-pass aggregation
 * over a deck's reviews that yields the rating headline (count, average, and the
 * 1★..5★ distribution) in one round trip. It backs both the summary endpoint's
 * histogram and the denormalized {@code DeckStats.rating_average / rating_count}
 * the deck card and list views read. See {@link DeckReviewRepositoryImpl}.
 */
public interface DeckReviewRepositoryCustom {

    /**
     * Aggregate the deck's reviews into a rating summary.
     *
     * @param deckId the deck whose reviews to summarize
     * @return the count, average (null when there are no reviews) and a length-5
     *         distribution where index {@code i} holds the number of {@code (i+1)}★
     *         reviews
     */
    RatingAggregate aggregate(String deckId);

    /**
     * The rating summary for a deck.
     *
     * @param count        total reviews
     * @param average      mean stars (1..5), {@code null} when {@code count} is 0
     * @param distribution per-star counts; index 0 = 1★ … index 4 = 5★
     */
    record RatingAggregate(long count, Double average, long[] distribution) {

        /** The empty summary for a deck with no reviews. */
        static RatingAggregate empty() {
            return new RatingAggregate(0, null, new long[5]);
        }
    }
}
