package com.cephadex.ambi.presentation.deck.analytics;

import org.springframework.data.mongodb.core.mapping.Field;

/**
 * One frequently-chosen wrong answer for a slide, with how often it was picked.
 * The {@code choice} is the same compact tally key used by
 * {@code RoundResult.optionCounts} (e.g. sorted MCQ option ids, or normalized
 * text); {@code optionLabel} carries a human-readable form when one is resolvable.
 *
 * @param choice           the tally key of the wrong answer
 * @param optionLabel      display label, {@code null} if not resolvable (e.g. free text)
 * @param count            times this wrong answer was chosen
 * @param shareOfResponses fraction of all responses to the slide (0..1)
 * @param shareOfWrong     fraction among only the incorrect responses (0..1)
 */
public record CommonMistake(
        @Field("choice") String choice,
        @Field("option_label") String optionLabel,
        @Field("count") long count,
        @Field("share_of_responses") double shareOfResponses,
        @Field("share_of_wrong") double shareOfWrong) {
}
