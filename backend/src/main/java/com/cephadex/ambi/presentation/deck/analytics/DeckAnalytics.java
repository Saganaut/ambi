package com.cephadex.ambi.presentation.deck.analytics;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.Deck;

/**
 * Extensive, denormalized analytics rollup for a single deck — the source of the
 * difficulty rankings, common-mistake breakdowns, timing and score distributions
 * surfaced in the deck dashboard. Stored separately from {@link Deck} (keyed by
 * the deck id) so the heavy, frequently-recomputed payload neither bloats the
 * deck document nor contends with its {@code @Version} lock. Built entirely from
 * the {@code round_results} collection plus session lifecycle events.
 *
 * @param id                            the deck id this analytics doc describes
 * @param schemaVersion                 rollup schema version, for forward migration
 * @param computedAt                    when this rollup was last recomputed
 * @param sampleSessionCount            sessions that fed this rollup (the sample size)
 * @param totalSessions                 sessions ever started
 * @param completedSessions             sessions that reached {@code FINISHED}
 * @param abandonedSessions             sessions started but never finished
 * @param completionRate                {@code completedSessions / totalSessions} (0..1)
 * @param uniquePlayers                 distinct participants across all sessions
 * @param totalParticipations           sum of roster sizes across sessions (non-distinct)
 * @param averageParticipantsPerSession mean roster size
 * @param viewCount                     deck detail/preview views
 * @param forkCount                     decks created with this deck as {@code parentDeckId}
 * @param firstPlayedAt                 close time of the first session, {@code null} if never played
 * @param lastPlayedAt                  close time of the most recent session
 * @param averageSessionDurationMs      mean wall-clock session length
 * @param ratingCount                   number of ratings submitted
 * @param ratingAverage                 mean star rating (1..5), {@code null} until rated
 * @param ratingDistribution            star value (1..5) &rarr; count
 * @param averageScorePercent           mean final score as a fraction of points available (0..1)
 * @param medianScorePercent            median final score fraction (0..1)
 * @param scoreDistribution             histogram of final score fractions
 * @param slides                        per-slide breakdown, one entry per scored/played slide
 * @param hardestSlideIds               slide ids ordered hardest&rarr;easiest (by observed correct rate)
 * @param easiestSlideIds               slide ids ordered easiest&rarr;hardest
 * @param mostSkippedSlideIds           slide ids ordered by highest no-response rate
 * @param slowestSlideIds               slide ids ordered by highest median response time
 */
@Document(collection = "deck_analytics")
public record DeckAnalytics(
        @Id String id,
        @Field("schema_version") int schemaVersion,
        @Field("computed_at") Instant computedAt,
        @Field("sample_session_count") long sampleSessionCount,

        // ── Engagement / lifecycle ──────────────────────────────
        @Field("total_sessions") long totalSessions,
        @Field("completed_sessions") long completedSessions,
        @Field("abandoned_sessions") long abandonedSessions,
        @Field("completion_rate") double completionRate,
        @Field("unique_players") long uniquePlayers,
        @Field("total_participations") long totalParticipations,
        @Field("average_participants_per_session") double averageParticipantsPerSession,
        @Field("view_count") long viewCount,
        @Field("fork_count") long forkCount,
        @Field("first_played_at") Instant firstPlayedAt,
        @Field("last_played_at") Instant lastPlayedAt,
        @Field("average_session_duration_ms") double averageSessionDurationMs,

        // ── Ratings ─────────────────────────────────────────────
        @Field("rating_count") long ratingCount,
        @Field("rating_average") Double ratingAverage,
        @Field("rating_distribution") Map<Integer, Integer> ratingDistribution,

        // ── Scoring ─────────────────────────────────────────────
        @Field("average_score_percent") double averageScorePercent,
        @Field("median_score_percent") double medianScorePercent,
        @Field("score_distribution") List<ScoreBucket> scoreDistribution,

        // ── Per-slide ───────────────────────────────────────────
        @Field("slides") List<SlideStats> slides,
        @Field("hardest_slide_ids") List<String> hardestSlideIds,
        @Field("easiest_slide_ids") List<String> easiestSlideIds,
        @Field("most_skipped_slide_ids") List<String> mostSkippedSlideIds,
        @Field("slowest_slide_ids") List<String> slowestSlideIds) {

    /** Null-coalesce every collection so consumers never see {@code null}. */
    public DeckAnalytics {
        ratingDistribution = ratingDistribution == null ? Map.of() : ratingDistribution;
        scoreDistribution = scoreDistribution == null ? List.of() : scoreDistribution;
        slides = slides == null ? List.of() : slides;
        hardestSlideIds = hardestSlideIds == null ? List.of() : hardestSlideIds;
        easiestSlideIds = easiestSlideIds == null ? List.of() : easiestSlideIds;
        mostSkippedSlideIds = mostSkippedSlideIds == null ? List.of() : mostSkippedSlideIds;
        slowestSlideIds = slowestSlideIds == null ? List.of() : slowestSlideIds;
    }

    /** Empty rollup for a deck with no recorded play yet. */
    public static DeckAnalytics empty(String deckId) {
        return new DeckAnalytics(deckId, 1, null, 0,
                0, 0, 0, 0.0, 0, 0, 0.0, 0, 0, null, null, 0.0,
                0, null, null,
                0.0, 0.0, null,
                null, null, null, null, null);
    }
}
