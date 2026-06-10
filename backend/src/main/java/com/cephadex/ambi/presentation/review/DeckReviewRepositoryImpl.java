package com.cephadex.ambi.presentation.review;

import java.util.List;

import org.bson.Document;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.aggregation.Aggregation;
import org.springframework.data.mongodb.core.aggregation.AggregationResults;

/**
 * {@link DeckReviewRepositoryCustom} implementation. The {@code Impl} suffix is what
 * Spring Data wires into {@link DeckReviewRepository} automatically.
 *
 * <p>One {@code $group} on {@code stars} returns at most five rows ({@code {_id:
 * stars, count}}); the count, average and 1★..5★ distribution are assembled from
 * those in Java. Grouping by the rated value keeps the pipeline a single pass and
 * avoids {@code $facet} — there is never more than one bucket per star value.
 */
class DeckReviewRepositoryImpl implements DeckReviewRepositoryCustom {

    private final MongoTemplate mongoTemplate;

    DeckReviewRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public RatingAggregate aggregate(String deckId) {
        // `deck_id` is @Field-mapped; `stars` is a bare camelCase field.
        Aggregation aggregation = Aggregation.newAggregation(
                Aggregation.match(org.springframework.data.mongodb.core.query.Criteria
                        .where("deck_id").is(deckId)),
                Aggregation.group("stars").count().as("count"));

        AggregationResults<Document> results =
                mongoTemplate.aggregate(aggregation, DeckReview.class, Document.class);
        List<Document> buckets = results.getMappedResults();
        if (buckets.isEmpty()) {
            return RatingAggregate.empty();
        }

        long[] distribution = new long[5];
        long total = 0;
        long weightedSum = 0;
        for (Document bucket : buckets) {
            int stars = ((Number) bucket.get("_id")).intValue();
            long count = ((Number) bucket.get("count")).longValue();
            if (stars >= 1 && stars <= 5) {
                distribution[stars - 1] = count;
            }
            total += count;
            weightedSum += (long) stars * count;
        }
        Double average = total == 0 ? null : (double) weightedSum / total;
        return new RatingAggregate(total, average, distribution);
    }
}
