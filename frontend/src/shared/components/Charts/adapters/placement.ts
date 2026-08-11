/**
 * Sample response density for the placement kinds (AXIS, PLACE_ON_IMAGE) — the
 * `mcqSampleDistribution` of a 2D surface.
 *
 * Authoring time has no responses, so the heatmap previews a deterministic
 * crowd: each item's id is hashed into a seed, and a fixed number of pseudo
 * responses is scattered around the item's authored target (spread proportional
 * to the slide's tolerance, so a loose target reads as a loose cloud). An item
 * with no target yet gets a hashed pseudo position rather than the plane's
 * centre, so unplaced items stay distinguishable.
 *
 * Points are counted in the question's OWN normalized space — the one the
 * grader and the backend's tally keys measure in — so the caller applies its
 * surface's `invertY` when it positions a cell, exactly as the live boards do
 * with the real tally.
 */
import { clamp01, type NormalizedPoint } from "@utils/placementGeometry";
import { PLACEMENT_TALLY_BUCKETS } from "@utils/tallyBuckets";

/** An item to scatter responses around: its id, plus its target when placed. */
interface PlacementSampleItem {
  id: string;
  target?: NormalizedPoint;
}

/** One occupied bucket of the density grid. */
interface PlacementHeatCell {
  /** `"bucketX,bucketY"` — the tally-key suffix shape the boards decode. */
  key: string;
  bucketX: number;
  bucketY: number;
  total: number;
}

interface PlacementDensity {
  /** Occupied buckets only, in a stable top-row-first sweep. */
  cells: PlacementHeatCell[];
  /** The busiest bucket's total — the denominator a cell shades against. */
  highestTotal: number;
  /** Every sampled response across every item. */
  total: number;
  /** Buckets per axis the cells were counted in — the renderer's cell size. */
  buckets: number;
}

interface PlacementDensityOptions {
  /** The slide's normalized tolerance radius — the cloud's spread. */
  tolerance: number;
}

/**
 * Responses sampled per item, `MIN_RESPONSES` to `MIN_RESPONSES + RESPONSE_RANGE - 1`
 * by hash. Sized so the cloud fills a {@link PLACEMENT_TALLY_BUCKETS} grid densely
 * enough to read as a field with real gradation rather than scattered cells — a
 * finer grid needs a bigger crowd, quadratically.
 */
const MIN_RESPONSES = 26;
const RESPONSE_RANGE = 37;
/** Widens the cloud past the tolerance circle, so near-misses show too. */
const SPREAD_FACTOR = 1.4;
/** Floor for a near-zero tolerance, so a tight target still reads as a cloud. */
const MIN_SPREAD = 0.04;

const hashId = (id: string): number => {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

/**
 * A linear congruential generator over [0, 1), seeded by an item's hash: the
 * sampler's only source of "randomness", so the same slide always previews the
 * same crowd.
 */
const unitSequence = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
};

/**
 * A tent-distributed offset in [-spread, spread]: averaging two uniforms bunches
 * responses around the target instead of filling its box evenly.
 */
const tentOffset = (nextUnit: () => number, spread: number): number =>
  ((nextUnit() + nextUnit()) / 2 - 0.5) * 2 * spread;

const bucketOf = (value: number, buckets: number): number =>
  Math.min(buckets - 1, Math.floor(clamp01(value) * buckets));

const placementSampleDensity = (
  items: readonly PlacementSampleItem[],
  { tolerance }: PlacementDensityOptions,
): PlacementDensity => {
  const buckets = PLACEMENT_TALLY_BUCKETS;
  const totals = new Map<string, number>();
  const spread = Math.max(MIN_SPREAD, tolerance) * SPREAD_FACTOR;
  let total = 0;

  for (const item of items) {
    const hash = hashId(item.id);
    const nextUnit = unitSequence(hash + 1);
    const centre = item.target ?? { x: nextUnit(), y: nextUnit() };
    const responses = (hash % RESPONSE_RANGE) + MIN_RESPONSES;

    for (let response = 0; response < responses; response++) {
      const x = centre.x + tentOffset(nextUnit, spread);
      const y = centre.y + tentOffset(nextUnit, spread);
      const key = `${bucketOf(x, buckets).toString()},${bucketOf(y, buckets).toString()}`;
      totals.set(key, (totals.get(key) ?? 0) + 1);
      total += 1;
    }
  }

  const cells: PlacementHeatCell[] = [];
  for (let bucketY = buckets - 1; bucketY >= 0; bucketY--) {
    for (let bucketX = 0; bucketX < buckets; bucketX++) {
      const key = `${bucketX.toString()},${bucketY.toString()}`;
      const cellTotal = totals.get(key);
      if (cellTotal == null) continue;
      cells.push({ key, bucketX, bucketY, total: cellTotal });
    }
  }

  return {
    cells,
    highestTotal: Math.max(1, ...cells.map((cell) => cell.total)),
    total,
    buckets,
  };
};

export { placementSampleDensity };
export type { PlacementDensity, PlacementHeatCell, PlacementSampleItem };
