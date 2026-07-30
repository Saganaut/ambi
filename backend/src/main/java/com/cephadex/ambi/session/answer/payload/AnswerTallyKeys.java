package com.cephadex.ambi.session.answer.payload;

import java.util.List;
import java.util.stream.IntStream;

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
     * PLACE_ON_IMAGE pins are quantized into a {@code PLACE_TALLY_BUCKETS ×
     * PLACE_TALLY_BUCKETS} bucket grid at key-derivation time — one pin per item
     * (keyed {@code itemId@bx,by}) means the histogram is a density scatter, so a
     * finer resolution than the shared Axis grid gives the board a crisper heat
     * overlay. The frontend
     * mirrors this constant to lay the scatter out over the backing image (it is
     * not a request-DTO bound, so it does not flow through
     * {@code generate-validation}); keep the two in sync.
     */
    public static final int PLACE_TALLY_BUCKETS = 20;

    /**
     * The option-tally keys contributed by {@code payload}: one per chosen MCQ
     * option, one {@code itemId@rowIndex,colIndex} key per grid placement (so
     * the live board can shade each cell by what landed there), one
     * {@code itemId@bucketX,bucketY} key per axis placement (quantized, so the
     * live board can heat-map the plane), one {@code statementId@bucket} key
     * per scales position (quantized, so the board can heat each statement's
     * track), one {@code leftId@rightId} key per matching connection (so the
     * live board can count each pairing), one {@code itemId@position} key
     * per ranked slot (0-based, so the board can tally how often each item
     * lands in each rank), or one {@code itemId@bucketX,bucketY} key per
     * place-on-image pin (quantized, so the board can render a per-item density
     * scatter of where each item's pin landed), or the single picked
     * {@code optionId} of a follow-up vote (the pick <em>is</em> that round's
     * answer). Returns an empty list for payloads
     * that aren't tallied yet (free text, drawings, …), so the caller simply
     * counts nothing for them.
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
        if (payload instanceof MatchingAnswer matching && matching.matches() != null) {
            // Both sides are client-minted alphanumeric card ids (no "@"), so the
            // key splits unambiguously under the same grammar.
            return matching.matches().entrySet().stream()
                    .map(match -> match.getKey() + GRID_KEY_SEPARATOR + match.getValue())
                    .toList();
        }
        if (payload instanceof RankingAnswer ranking && ranking.orderedItemIds() != null) {
            // One key per ranked slot: the 0-based position is a small int (a
            // strict subset of grid's "r,c" suffix), so "itemId@position" splits
            // unambiguously under the same grammar. Lets the board tally how
            // often each item landed at each rank.
            List<String> ordered = ranking.orderedItemIds();
            return IntStream.range(0, ordered.size())
                    .mapToObj(position -> ordered.get(position) + GRID_KEY_SEPARATOR + position)
                    .toList();
        }
        if (payload instanceof FollowUpAnswer followUp && followUp.optionId() != null) {
            // The pick on a follow-up board is the round's answer, so the option
            // id is the tally key verbatim — v1 is single-select, hence exactly
            // one key per participant.
            return List.of(followUp.optionId());
        }
        if (payload instanceof PlaceOnImageAnswer place && place.placements() != null) {
            // One "itemId@bucketX,bucketY" key per placed pin — exactly Axis's
            // per-item bucket grammar, but quantized at the finer
            // PLACE_TALLY_BUCKETS resolution so the board can render a per-item
            // density scatter over the backing image.
            return place.placements().entrySet().stream()
                    .map(placement -> placement.getKey() + GRID_KEY_SEPARATOR
                            + bucket(placement.getValue().x(), PLACE_TALLY_BUCKETS) + ","
                            + bucket(placement.getValue().y(), PLACE_TALLY_BUCKETS))
                    .toList();
        }
        return List.of();
    }

    /** Quantize a normalized [0, 1] coordinate over the shared Axis/Scales grid. */
    private static int bucket(double coordinate) {
        return bucket(coordinate, AXIS_TALLY_BUCKETS);
    }

    /** Quantize a normalized [0, 1] coordinate into {@code buckets} bins; 1.0 clamps into the last bin. */
    private static int bucket(double coordinate, int buckets) {
        return Math.min((int) Math.floor(coordinate * buckets), buckets - 1);
    }
}
