/**
 * Sample per-statement bucket counts for the SCALES diverging bar — the
 * `mcqSampleDistribution` of a Likert strip.
 *
 * Authoring time has no ratings, so each statement's id is hashed into a lean
 * (the bucket its crowd clusters on), a spread and a crowd size, and the
 * responses are dealt out by a triangular weight around that lean. A statement
 * therefore skews where its id says it does — one leans low while its neighbour
 * leans high — and the same slide always previews the same crowd.
 *
 * Five buckets, not the ten a real tally is quantized at (`SCALES_TALLY_BUCKETS`
 * in `@utils/tallyBuckets`): five is the Likert grain a diverging bar reads at,
 * and ten folds into it 2:1, so swapping the sample for a live tally later needs
 * no re-bucketing of the chart.
 */

/** Buckets one statement's span is cut into, low → high. */
const SCALES_DIVERGING_BUCKETS = 5;

/** The bucket index that straddles the centre baseline — the "no lean" bucket. */
const SCALES_DIVERGING_MID_INDEX = (SCALES_DIVERGING_BUCKETS - 1) / 2;

/** Ratings sampled per statement, `MIN_RATINGS` to `MIN_RATINGS + RATING_RANGE - 1` by hash. */
const MIN_RATINGS = 18;
const RATING_RANGE = 23;

/** How many buckets either side of the lean still draw a crowd, and how sharply. */
const MIN_REACH = 2;
const REACH_RANGE = 2;
const MIN_PEAK = 2;
const PEAK_RANGE = 3;

/** One bucket of a statement's strip: its span in scale units and its crowd. */
interface ScalesSampleBucket {
  /** 0-based position across the strip, low → high. */
  index: number;
  /** Lower bound in scale units (inclusive). */
  from: number;
  /** Upper bound in scale units (inclusive only for the top bucket). */
  to: number;
  count: number;
}

interface ScalesStatementSample {
  statementId: string;
  buckets: ScalesSampleBucket[];
  /** Ratings across this statement's buckets — its own percentage denominator. */
  total: number;
}

interface ScalesSample {
  statements: ScalesStatementSample[];
  /** The bucket bounds every statement shares, for the chart's bucket legend. */
  bounds: Pick<ScalesSampleBucket, "index" | "from" | "to">[];
  /** Ratings sampled across every statement. */
  total: number;
}

interface ScalesSampleStatement {
  id: string;
}

interface ScalesSampleRange {
  min: number;
  max: number;
}

const hashId = (id: string): number => {
  let hash = 0;
  for (let index = 0; index < id.length; index++) {
    hash = (hash << 5) - hash + id.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash);
};

const bucketBounds = ({ min, max }: ScalesSampleRange) => {
  const span = max - min;
  return Array.from({ length: SCALES_DIVERGING_BUCKETS }, (_unused, index) => ({
    index,
    from: min + (span * index) / SCALES_DIVERGING_BUCKETS,
    to: min + (span * (index + 1)) / SCALES_DIVERGING_BUCKETS,
  }));
};

/**
 * Deals `ratings` across `weights` as whole ratings that still sum to `ratings`:
 * floor every share, then hand the shortfall out largest-fraction-first (ties by
 * index, so the result stays a function of the hash alone).
 */
const dealRatings = (weights: number[], ratings: number): number[] => {
  const weightTotal = weights.reduce((sum, weight) => sum + weight, 0);
  const exact = weights.map((weight) => (weight / weightTotal) * ratings);
  const counts = exact.map((share) => Math.floor(share));
  const shortfall = ratings - counts.reduce((sum, count) => sum + count, 0);
  const byFraction = exact
    .map((share, index) => ({ index, fraction: share - Math.floor(share) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);

  for (let handed = 0; handed < shortfall; handed++) {
    const slot = byFraction[handed % byFraction.length];
    counts[slot.index] += 1;
  }
  return counts;
};

/**
 * The sample crowd for a slide's statements. Called in render, so it is pure and
 * cheap: one pass per statement over {@link SCALES_DIVERGING_BUCKETS} buckets.
 */
const scalesSampleDistribution = (
  statements: readonly ScalesSampleStatement[],
  range: ScalesSampleRange,
): ScalesSample => {
  const bounds = bucketBounds(range);
  let total = 0;

  const sampled = statements.map((statement) => {
    const hash = hashId(statement.id);
    const lean = hash % SCALES_DIVERGING_BUCKETS;
    const reach = MIN_REACH + ((hash >> 3) % REACH_RANGE);
    const peak = MIN_PEAK + ((hash >> 6) % PEAK_RANGE);
    const ratings = MIN_RATINGS + (hash % RATING_RANGE);

    const weights = bounds.map(
      ({ index }) => 1 + Math.max(0, reach - Math.abs(index - lean)) * peak,
    );
    const counts = dealRatings(weights, ratings);
    total += ratings;

    return {
      statementId: statement.id,
      buckets: bounds.map((bound) => ({ ...bound, count: counts[bound.index] })),
      total: ratings,
    };
  });

  return { statements: sampled, bounds, total };
};

export { SCALES_DIVERGING_BUCKETS, SCALES_DIVERGING_MID_INDEX, scalesSampleDistribution };
export type {
  ScalesSample,
  ScalesSampleBucket,
  ScalesSampleRange,
  ScalesSampleStatement,
  ScalesStatementSample,
};
