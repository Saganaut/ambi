package com.cephadex.ambi.presentation.review;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Persistence for {@link DeckReview} aggregates — one review per
 * {@code (deckId, userId)} pair, enforced by the document's unique compound index.
 * The list read is paginated newest-first; the rating summary (average / count /
 * star distribution) is computed in a single aggregation by
 * {@link DeckReviewRepositoryCustom#aggregate(String)}.
 */
public interface DeckReviewRepository
        extends MongoRepository<DeckReview, String>, DeckReviewRepositoryCustom {

    Page<DeckReview> findByDeckIdOrderByCreatedAtDesc(String deckId, Pageable pageable);

    Optional<DeckReview> findByDeckIdAndUserId(String deckId, String userId);
}
