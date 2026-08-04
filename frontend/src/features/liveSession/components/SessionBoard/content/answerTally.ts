/**
 * The shared shape of a board's live tally: how a round's `optionCounts` — the
 * `itemId@suffix` histogram the backend derives in `AnswerTallyKeys` — becomes
 * the numbers a heat overlay shades by, plus the bucket resolutions those keys
 * were quantized at.
 *
 * Every placement board's aggregation lands in one of two shapes:
 *   - totals keyed by the key's suffix — grid cells (`"row,col"`), axis and
 *     place-on-image buckets (`"bucketX,bucketY"`);
 *   - per-item arrays indexed by a small integer suffix — scales buckets,
 *     ranking slots, allocation points.
 * Both drop malformed and non-positive entries, so a board can render straight
 * from the result. What each board then DOES with the numbers — heat cells,
 * density dots, per-row strips — stays with the board.
 */

/**
 * Separator between the item id and the cell in a tally key. Mirrors the
 * backend's `AnswerTallyKeys.GRID_KEY_SEPARATOR`: neither half can contain it,
 * so a key splits unambiguously.
 */
const TALLY_KEY_SEPARATOR = "@";

/**
 * Bucket count per axis of the AXIS plane's and the SCALES strip's quantization
 * grid. Manual mirror of the backend's single `AnswerTallyKeys.AXIS_TALLY_BUCKETS`
 * — one constant there, deliberately shared by both kinds. It is not a
 * request-DTO bound, so it does not flow through codegen; keep the two in sync
 * by hand (the same discipline as `NON_SCORABLE_SLIDE_TYPES` in slideContent.ts).
 */
const AXIS_TALLY_BUCKETS = 10;

/**
 * Bucket count per axis of the PLACE_ON_IMAGE density scatter's quantization
 * grid. Manual mirror of the backend's separate
 * `AnswerTallyKeys.PLACE_TALLY_BUCKETS` — a finer resolution than the shared
 * axis/scales grid, so the scatter reads crisply over the backing image. Not a
 * request-DTO bound either; keep the two in sync by hand.
 */
const PLACE_TALLY_BUCKETS = 20;

/** One decoded `"bucketX,bucketY"` tally-key suffix. */
interface BucketCoordinates {
  bucketX: number;
  bucketY: number;
}

/**
 * Decode a `"bucketX,bucketY"` key suffix, or `null` when it isn't a pair of
 * integers — a board renders only what it can place, so anything malformed is
 * dropped rather than rendered at NaN.
 */
const parseBucketKey = (bucketKey: string): BucketCoordinates | null => {
  const [bucketX, bucketY] = bucketKey.split(",").map(Number);
  if (!Number.isInteger(bucketX) || !Number.isInteger(bucketY)) return null;
  return { bucketX, bucketY };
};

/**
 * Sum the live per-`itemId@suffix` tally into totals keyed by the suffix alone,
 * collapsing every item that landed on the same cell / bucket into one number.
 * Keys with no suffix and non-positive counts contribute nothing.
 */
const tallyTotalsByBucket = (optionCounts: Record<string, number>): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    const bucket = key.split(TALLY_KEY_SEPARATOR)[1];
    if (!bucket || count <= 0) continue;
    totals[bucket] = (totals[bucket] ?? 0) + count;
  }
  return totals;
};

/**
 * Sum the live per-`itemId@slot` tally into per-item arrays of length
 * {@link slotCount}, indexed by the 0-based slot the suffix names (a scales
 * bucket, a ranking position, an allocated point count). Items with no votes
 * are absent rather than zero-filled; keys whose slot is missing, non-integer
 * or out of range contribute nothing.
 */
const tallyTotalsBySlot = (
  optionCounts: Record<string, number>,
  slotCount: number,
): Record<string, number[]> => {
  const totals: Record<string, number[]> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    if (count <= 0) continue;
    const [itemId, slotPart] = key.split(TALLY_KEY_SEPARATOR);
    if (!itemId || !slotPart) continue;
    const slot = Number(slotPart);
    if (!Number.isInteger(slot) || slot < 0 || slot >= slotCount) continue;
    const slots = totals[itemId] ?? (totals[itemId] = Array<number>(slotCount).fill(0));
    slots[slot] += count;
  }
  return totals;
};

export type { BucketCoordinates };
export {
  AXIS_TALLY_BUCKETS,
  PLACE_TALLY_BUCKETS,
  parseBucketKey,
  tallyTotalsByBucket,
  tallyTotalsBySlot,
};
