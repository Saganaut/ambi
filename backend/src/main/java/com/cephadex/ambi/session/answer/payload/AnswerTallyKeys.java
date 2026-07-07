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
     * Separator between the item id and the cell in a grid tally key. {@code @}
     * cannot appear in a cell id ({@code "rowIndex,colIndex"}) and item ids are
     * client-minted alphanumerics, so the key splits unambiguously.
     */
    public static final String GRID_KEY_SEPARATOR = "@";

    /**
     * The option-tally keys contributed by {@code payload}: one per chosen MCQ
     * option, or one {@code itemId@rowIndex,colIndex} key per grid placement (so
     * the live board can shade each cell by what landed there). Returns an empty
     * list for payloads that aren't tallied yet (free text, drawings, …), so the
     * caller simply counts nothing for them.
     */
    public static List<String> optionKeys(AnswerPayload payload) {
        if (payload instanceof McqAnswer mcq) {
            return List.copyOf(mcq.optionIds());
        }
        if (payload instanceof GridAnswer grid && grid.placements() != null) {
            return grid.placements().entrySet().stream()
                    .map(placement -> placement.getKey() + GRID_KEY_SEPARATOR + placement.getValue())
                    .toList();
        }
        return List.of();
    }
}
