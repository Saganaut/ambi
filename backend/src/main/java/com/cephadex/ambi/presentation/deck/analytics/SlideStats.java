package com.cephadex.ambi.presentation.deck.analytics;

import java.util.List;
import java.util.Map;

import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.slide.content.parts.SlideContentTypes.ScoreMode;
import com.cephadex.ambi.presentation.slide.enums.Difficulty;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * Aggregated performance for one slide across every session that played it. The
 * unit of "which slides were hardest" and "what were the common mistakes". Rolled
 * up from all {@code RoundResult}s sharing this {@code slideId}.
 *
 * <p>Scoring is not always binary: {@code ScoreMode} on the content type can award
 * partial credit ({@code PARTIAL}, {@code RANGE}, {@code CLOSEST}, {@code NEAREST},
 * {@code DISTANCE}). So {@code correctRate} (fully-correct fraction) is paired with
 * {@code averageScoreRatio} (mean fraction of {@code pointValue} earned), which is
 * the difficulty signal that generalizes across all scorable types.
 *
 * @param slideId               stable slide UUID (matches the deck snapshot / round id)
 * @param slideType             the slide's content type
 * @param title                 title snapshot at rollup time (slides can be edited later)
 * @param scorable              whether this slide had a gradeable answer key
 * @param scoreMode             authored scoring strategy snapshot; {@code null} for
 *                              types without one (MCQ, follow-up, drawing) and non-scorable
 * @param configuredDifficulty  author-set difficulty, {@code null} for non-scorable
 * @param observedDifficulty    empirical difficulty bucket derived from {@code averageScoreRatio}
 *                              (e.g. &ge;0.8 EASY, &ge;0.5 MEDIUM, &ge;0.2 HARD, else IMPOSSIBLE);
 *                              {@code null} for non-scorable
 * @param timesPlayed           number of rounds (sessions) that ran this slide
 * @param totalResponses        total answers submitted across those rounds
 * @param correctResponses      answers graded fully correct (full points earned)
 * @param correctRate           {@code correctResponses / totalResponses} (0..1) — fully-correct fraction
 * @param averageScoreRatio     mean earned points as a fraction of {@code pointValue} (0..1);
 *                              partial-credit aware, the generalized difficulty signal
 * @param noResponseCount       participants who saw the slide but did not answer
 * @param skipRate              {@code noResponseCount / (totalResponses + noResponseCount)} (0..1)
 * @param averageResponseTimeMs mean time from round open to submission
 * @param medianResponseTimeMs  median submission time
 * @param fastestResponseTimeMs fastest correct submission observed, {@code null} if none correct
 * @param averagePointsAwarded  mean points awarded per participant on this slide
 *                              (includes best-answer / deception bonuses where applicable)
 * @param discriminationIndex   optional 0..1 signal of how well this slide separates
 *                              high- from low-scorers; {@code null} if not computed
 * @param optionDistribution    full tally of every choice &rarr; count (across all rounds);
 *                              richest for discrete-choice types, sparse for continuous/freeform
 * @param commonMistakes        wrong answers ranked by frequency (descending)
 */
public record SlideStats(
        @Field("slide_id") String slideId,
        @Field("slide_type") SlideType slideType,
        @Field("title") String title,
        @Field("scorable") boolean scorable,
        @Field("score_mode") ScoreMode scoreMode,
        @Field("configured_difficulty") Difficulty configuredDifficulty,
        @Field("observed_difficulty") Difficulty observedDifficulty,
        @Field("times_played") long timesPlayed,
        @Field("total_responses") long totalResponses,
        @Field("correct_responses") long correctResponses,
        @Field("correct_rate") double correctRate,
        @Field("average_score_ratio") double averageScoreRatio,
        @Field("no_response_count") long noResponseCount,
        @Field("skip_rate") double skipRate,
        @Field("average_response_time_ms") double averageResponseTimeMs,
        @Field("median_response_time_ms") double medianResponseTimeMs,
        @Field("fastest_response_time_ms") Long fastestResponseTimeMs,
        @Field("average_points_awarded") double averagePointsAwarded,
        @Field("discrimination_index") Double discriminationIndex,
        @Field("option_distribution") Map<String, Integer> optionDistribution,
        @Field("common_mistakes") List<CommonMistake> commonMistakes) {

    public SlideStats {
        optionDistribution = optionDistribution == null ? Map.of() : optionDistribution;
        commonMistakes = commonMistakes == null ? List.of() : commonMistakes;
    }
}
