/**
 * The resolutions answers are quantized at before they become tally keys,
 * shared by the live boards' overlays and the editor's sample heatmap so an
 * authored preview and a live tally read at the same grain.
 *
 * Manual mirrors of the backend's `AnswerTallyKeys` constants — quantization
 * itself happens server-side, at key-derivation time. They are not request-DTO
 * bounds, so they do not flow through codegen; keep the two in sync by hand.
 */

/**
 * Buckets per axis of the grid every continuous 2D placement is counted in —
 * AXIS points and PLACE_ON_IMAGE pins alike, so a heat cell covers the same
 * fraction of either surface.
 */
const PLACEMENT_TALLY_BUCKETS = 20;

/**
 * Buckets in one SCALES statement's strip. A strip is one-dimensional and reads
 * as a row of countable segments rather than a heat field, so it stays coarser
 * than the placement grid and moves independently of it.
 */
const SCALES_TALLY_BUCKETS = 10;

export { PLACEMENT_TALLY_BUCKETS, SCALES_TALLY_BUCKETS };
