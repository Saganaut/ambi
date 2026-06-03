package com.cephadex.ambi.presentation.deck.analytics;

import org.springframework.data.mongodb.core.mapping.Field;

/**
 * One bar of the final-score histogram: how many participants finished with a
 * score fraction in {@code [lowerPercent, upperPercent)}.
 *
 * @param lowerPercent inclusive lower bound, 0..100
 * @param upperPercent exclusive upper bound, 0..100
 * @param count        participants whose final score fell in this band
 */
public record ScoreBucket(
        @Field("lower_percent") int lowerPercent,
        @Field("upper_percent") int upperPercent,
        @Field("count") long count) {
}
