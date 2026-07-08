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
     * Continuous placements are quantized into this many buckets at
     * key-derivation time — exact coordinates can't be histogram keys, a bucket
     * index can. Used for both AXIS placements (per axis, a 10 × 10 bucket grid)
     * and SCALES positions (one 10-bucket strip per statement). The frontend
     * mirrors this constant to aggregate the heat overlay (it is not a
     * request-DTO bound, so it does not flow through {@code generate-validation});
     * keep the two in sync.
     */
    public static final int AXIS_TALLY_BUCKETS = 10;

    /**
     * The option-tally keys contributed by {@code payload}: one per chosen MCQ
     * option, one {@code itemId@rowIndex,colIndex} key per grid placement (so
     * the live board can shade each cell by what landed there), one
     * {@code itemId@bucketX,bucketY} key per axis placement (quantized, so the
     * live board can heat-map the plane), or one {@code statementId@bucket} key
     * per scales position (quantized, so the board can heat each statement's
     * track). Returns an empty list for payloads that aren't tallied yet (free
     * text, drawings, …), so the caller simply counts nothing for them.
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
        if (payload instanceof AxisAnswer axis && axis.placements() != null) {
            // Bucket indices are small ints, so "bx,by" is exactly grid's cell-id
            // grammar and the whole @-separated pipeline applies unchanged.
            return axis.placements().entrySet().stream()
                    .map(placement -> placement.getKey() + GRID_KEY_SEPARATOR
                            + bucket(placement.getValue().x()) + "," + bucket(placement.getValue().y()))
                    .toList();
        }
        if (payload instanceof ScalesAnswer scales && scales.positions() != null) {
            // A single bucket int after "@" is a strict subset of grid's "r,c"
            // suffix, so it splits unambiguously under the same grammar.
            return scales.positions().entrySet().stream()
                    .map(rating -> rating.getKey() + GRID_KEY_SEPARATOR + bucket(rating.getValue()))
                    .toList();
        }
        return List.of();
    }

    /** Quantize a normalized [0, 1] coordinate to a bucket index; 1.0 clamps into the last bucket. */
    private static int bucket(double coordinate) {
        return Math.min((int) Math.floor(coordinate * AXIS_TALLY_BUCKETS), AXIS_TALLY_BUCKETS - 1);
    }
}
