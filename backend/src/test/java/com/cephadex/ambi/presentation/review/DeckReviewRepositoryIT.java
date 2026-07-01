package com.cephadex.ambi.presentation.review;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.Objects;

import org.bson.Document;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.ActiveProfiles;

import com.cephadex.ambi.config.AmbiApplication;
import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.presentation.review.DeckReviewRepositoryCustom.RatingAggregate;
import com.mongodb.client.MongoCollection;

/**
 * Exercises {@link DeckReviewRepository} against a real Mongo (the Docker instance
 * the test profile points at) to pin the three pieces the mocked service tests
 * can't reach: the {@code $group} rating aggregation actually maps the
 * {@code deck_id}/{@code stars} field names, the unique {@code (deck_id, user_id)}
 * index is created by {@link DeckReviewIndexInitializer}, and that index really
 * blocks a duplicate review. Scoped to a private deck id and cleaned up after.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class DeckReviewRepositoryIT {

    private static final String DECK_ID = "it-deck-deck-review-repository";

    @Autowired
    private DeckReviewRepository repository;

    @Autowired
    private MongoTemplate mongoTemplate;

    @BeforeEach
    @AfterEach
    void clean() {
        mongoTemplate.remove(new Query(Criteria.where("deck_id").is(DECK_ID)), DeckReview.class);
    }

    @Test
    void uniqueDeckUserIndexExists() {
        MongoCollection<Document> reviews = mongoTemplate.getCollection("deck_reviews");
        Document index = null;
        for (Document candidate : reviews.listIndexes()) {
            if ("uniq_deck_review_user".equals(candidate.getString("name"))) {
                index = candidate;
            }
        }
        assertThat(index).as("the deck_reviews unique index must be created at startup").isNotNull();
        Document presentIndex = Objects.requireNonNull(index);
        assertThat(presentIndex.getBoolean("unique", false)).isTrue();
        assertThat(presentIndex.get("key", Document.class)).containsKeys("deck_id", "user_id");
    }

    @Test
    void aggregateSummarizesStarsCountAndDistribution() {
        repository.save(review("r1", "u1", 5));
        repository.save(review("r2", "u2", 5));
        repository.save(review("r3", "u3", 2));

        RatingAggregate aggregate = repository.aggregate(DECK_ID);

        assertThat(aggregate.count()).isEqualTo(3);
        assertThat(aggregate.average()).isEqualTo((5 + 5 + 2) / 3.0);
        // index 0 = 1★ … index 4 = 5★
        assertThat(aggregate.distribution()).containsExactly(0, 1, 0, 0, 2);
    }

    @Test
    void aggregateOfDeckWithoutReviewsIsEmpty() {
        RatingAggregate aggregate = repository.aggregate(DECK_ID);

        assertThat(aggregate.count()).isZero();
        assertThat(aggregate.average()).isNull();
        assertThat(aggregate.distribution()).containsExactly(0, 0, 0, 0, 0);
    }

    @Test
    void uniqueIndexBlocksASecondReviewBySameUser() {
        repository.save(review("r1", "u1", 4));

        // A different document id but the same (deck, user) must collide.
        assertThatThrownBy(() -> repository.save(review("r2", "u1", 1)))
                .isInstanceOf(DuplicateKeyException.class);
    }

    private static DeckReview review(String id, String userPublicId, int stars) {
        DeckReview review = new DeckReview();
        review.setId(id);
        review.setDeckId(DECK_ID);
        review.setUserId(userPublicId);
        review.setAuthor(new Author(userPublicId, "Name", null));
        review.setStars(stars);
        review.setBody("body");
        return review;
    }
}
