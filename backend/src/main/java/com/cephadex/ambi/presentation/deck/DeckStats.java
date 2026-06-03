package com.cephadex.ambi.presentation.deck;

import java.time.Instant;

import org.springframework.data.mongodb.core.mapping.Field;

/**
 * Small, denormalized headline summary embedded in {@link Deck} for cheap reads
 * on deck cards, list views and sort keys. The full per-slide breakdown lives in
 * {@code DeckAnalytics}. Recomputed periodically and written via a targeted
 * {@code $set} on the {@code stats} field so it never contends with the deck's
 * {@code @Version} lock.
 *
 * @param playCount           sessions ever started from this deck
 * @param completedPlayCount  sessions that reached {@code FINISHED}
 * @param completionRate      {@code completedPlayCount / playCount} (0..1), stored for sorting
 * @param uniquePlayerCount   distinct participants across all sessions
 * @param viewCount           deck detail/preview views
 * @param forkCount           decks created with this deck as {@code parentDeckId}
 * @param averageScorePercent mean final score as a fraction of points available (0..1)
 * @param ratingAverage       mean star rating (1..5), {@code null} until rated
 * @param ratingCount         number of ratings submitted
 * @param lastPlayedAt        close time of the most recent session, {@code null} if never played
 * @param computedAt          when this summary was last recomputed
 */
public record DeckStats(
        @Field("play_count") long playCount,
        @Field("completed_play_count") long completedPlayCount,
        @Field("completion_rate") double completionRate,
        @Field("unique_player_count") long uniquePlayerCount,
        @Field("view_count") long viewCount,
        @Field("fork_count") long forkCount,
        @Field("average_score_percent") double averageScorePercent,
        @Field("rating_average") Double ratingAverage,
        @Field("rating_count") long ratingCount,
        @Field("last_played_at") Instant lastPlayedAt,
        @Field("computed_at") Instant computedAt) {

    /** Zeroed summary for a deck that has never been played. */
    public static DeckStats empty() {
        return new DeckStats(0, 0, 0.0, 0, 0, 0, 0.0, null, 0, null, null);
    }
}
