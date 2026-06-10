package com.cephadex.ambi.presentation.review;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.index.Index;
import org.springframework.data.mongodb.core.index.IndexOperations;
import org.springframework.stereotype.Component;

/**
 * Creates the {@code deck_reviews} collection index explicitly at startup.
 *
 * <p>This is the <strong>single source of truth</strong> for that index — not the
 * {@code @CompoundIndex} annotation on {@link DeckReview}. Spring Data MongoDB
 * leaves {@code spring.data.mongodb.auto-index-creation} <em>false</em>, so
 * annotation-driven indexes are never created; without this runner the
 * one-review-per-user rule would rest on the service's check-then-write upsert
 * alone, and a concurrent double-submit could slip a second row past it. The
 * unique {@code (deck_id, user_id)} index makes that a DB constraint, and — being
 * deck-id-prefixed — also serves the deck-scoped list and summary-aggregate reads.
 *
 * <p>{@link IndexOperations#createIndex} is idempotent for an unchanged
 * definition, so this is safe to run on every boot. Mirrors
 * {@code UserIndexInitializer}.
 */
@Component
public class DeckReviewIndexInitializer {

    private static final Logger log = LoggerFactory.getLogger(DeckReviewIndexInitializer.class);

    private final MongoTemplate mongoTemplate;

    public DeckReviewIndexInitializer(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void ensureIndexes() {
        IndexOperations ops = mongoTemplate.indexOps(DeckReview.class);

        // One review per (deck, user). Both fields are always set on a review, so
        // a plain unique compound index applies — no partial filter needed. The
        // deck_id prefix also covers findByDeckIdOrderByCreatedAtDesc and the
        // rating-summary aggregation's match stage.
        ops.createIndex(new Index().named("uniq_deck_review_user")
                .on("deck_id", Sort.Direction.ASC)
                .on("user_id", Sort.Direction.ASC)
                .unique());

        log.info("Ensured deck_reviews index (unique deck_id + user_id)");
    }
}
