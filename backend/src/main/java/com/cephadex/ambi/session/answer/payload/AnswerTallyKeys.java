package com.cephadex.ambi.session.answer.payload;

import java.util.List;

/**
 * Derives the per-option tally keys for an answer — the histogram keys behind the
 * live {@code TallyUpdated} bar chart. Shared so the live tally and the durable
 * {@code RoundResult.optionCounts} agree on what "an option count" means
 * (open-decisions D5): both must aggregate exactly these keys.
 *
 * <p>Distinct from {@code RoundEvaluator.describeChoice}, which renders a single
 * composite key for a participant's whole selection (the "what did they pick"
 * notion used in scoring). Here a multi-select MCQ contributes one key per chosen
 * option, so each option's bar moves independently.
 */
public final class AnswerTallyKeys {

    private AnswerTallyKeys() {
    }

    /**
     * The option-tally keys contributed by {@code payload}: one per chosen MCQ
     * option. Returns an empty list for payloads that aren't tallied yet (free
     * text, drawings, …), so the caller simply counts nothing for them.
     */
    public static List<String> optionKeys(AnswerPayload payload) {
        if (payload instanceof McqAnswer mcq) {
            return List.copyOf(mcq.optionIds());
        }
        return List.of();
    }
}
