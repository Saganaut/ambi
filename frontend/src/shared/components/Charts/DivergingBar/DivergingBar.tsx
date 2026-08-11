/**
 * Likert diverging stacked bar for SCALES: one row per statement, its ratings
 * bucketed across the scale and fanned left/right from a shared centre baseline.
 *
 * The encoding is diverging, not categorical — the two hues name the *side* of
 * the baseline a rating fell on and chroma grows outward from a neutral middle,
 * so a row's lean reads before any number does. Statement identity therefore
 * stays on the row's index pill and its legend row, never on the bar's colour.
 * The middle bucket straddles the baseline (half in each arm), so a crowd with
 * no lean sits centred rather than pushed to one side; the arm figures beside
 * each row are the *pure* low/high totals, with the middle share carried by the
 * row's accessible label and the per-segment tooltips.
 *
 * Beneath the plot sits the same editable statement bank the editing plane
 * shows — a chart of authored statements has to stay authorable.
 */
import { IndexPill } from "@/features/deck/components/DeckEditor/SlideContent/_shared/IndexPill/IndexPill";
import {
  SlideContent,
  SlideContentSection,
} from "@/features/deck/components/DeckEditor/SlideContent/SlideContentSection";
import type { RenderScalesResultsDisplayOptions } from "@/features/deck/components/DeckEditor/SlideContent/ScalesSlideContent/scalesResults.types";
import { ScalesStatementsSection } from "@/features/deck/components/DeckEditor/SlideContent/ScalesSlideContent/ScalesStatementsSection";
import { formatScaleValue } from "@utils/scaleValue";
import { numberToLetter } from "@utils/utils";
import { useEffect, useState } from "react";
import {
  SCALES_DIVERGING_MID_INDEX,
  scalesSampleDistribution,
  type ScalesSampleBucket,
  type ScalesStatementSample,
} from "../adapters/scales";
import { resolveDatumColor } from "../optionPalette";
import { withChartErrorBoundary } from "../withChartErrorBoundary";
import styles from "./DivergingBar.module.css";

/** Per-row delay of the mount fan-out, so the rows unfurl top-down. */
const ROW_STAGGER_MS = 70;

/**
 * The bucket fills, low → high. A diverging ramp: two hues either side of a
 * neutral middle, one class per bucket so no colour crosses into JS.
 */
const BUCKET_CLASSES = [
  styles.bucketLow,
  styles.bucketLowSoft,
  styles.bucketMid,
  styles.bucketHighSoft,
  styles.bucketHigh,
] as const;

/** One drawn block of a row: a whole bucket, or half the straddling middle one. */
interface DivergingSegment {
  key: string;
  bucketIndex: number;
  /** Share of the statement's ratings this block draws, in percent. */
  share: number;
  /** The whole bucket's rating count — what its tooltip reports. */
  count: number;
  from: number;
  to: number;
}

interface DivergingRow {
  id: string;
  /** The legend row's badge letter, so plot and bank name a statement alike. */
  letter: string;
  /** Resolved the same way the bank row resolves it, so the badges match. */
  color: string;
  label: string;
  /** Innermost-first, so the arm's last block is the one carrying the round end. */
  lowSegments: DivergingSegment[];
  highSegments: DivergingSegment[];
  /** Geometric reach of each arm from the baseline, in percent. */
  lowExtent: number;
  highExtent: number;
  /** The figures beside the row — the arms without the middle bucket. */
  lowShare: number;
  midShare: number;
  highShare: number;
  total: number;
}

const shareOf = (count: number, total: number): number => (count / total) * 100;

const toSegment = (
  bucket: ScalesSampleBucket,
  share: number,
  keySuffix: string,
): DivergingSegment => ({
  key: `${bucket.index.toString()}${keySuffix}`,
  bucketIndex: bucket.index,
  share,
  count: bucket.count,
  from: bucket.from,
  to: bucket.to,
});

const buildRow = (
  sample: ScalesStatementSample,
  index: number,
  label: string,
  color: string,
): DivergingRow => {
  const total = Math.max(1, sample.total);
  const buckets = sample.buckets;
  const mid = buckets[SCALES_DIVERGING_MID_INDEX];
  const midShare = shareOf(mid.count, total);
  const halfMid = midShare / 2;

  const lowBuckets = buckets.slice(0, SCALES_DIVERGING_MID_INDEX).reverse();
  const highBuckets = buckets.slice(SCALES_DIVERGING_MID_INDEX + 1);
  const sumShares = (of: ScalesSampleBucket[]) =>
    of.reduce((sum, bucket) => sum + shareOf(bucket.count, total), 0);

  const lowShare = sumShares(lowBuckets);
  const highShare = sumShares(highBuckets);

  return {
    id: sample.statementId,
    letter: numberToLetter(index + 1),
    color,
    label,
    lowSegments: [
      toSegment(mid, halfMid, "low"),
      ...lowBuckets.map((bucket) => toSegment(bucket, shareOf(bucket.count, total), "low")),
    ],
    highSegments: [
      toSegment(mid, halfMid, "high"),
      ...highBuckets.map((bucket) => toSegment(bucket, shareOf(bucket.count, total), "high")),
    ],
    lowExtent: lowShare + halfMid,
    highExtent: highShare + halfMid,
    lowShare,
    midShare,
    highShare,
    total,
  };
};

const asPercent = (share: number): string => `${Math.round(share).toString()}%`;

const DivergingBarInner = (props: RenderScalesResultsDisplayOptions) => {
  const { question, min, max, leftLabel, rightLabel } = props;
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(frame);
    };
  }, []);

  const lowCaption = leftLabel.trim().length > 0 ? leftLabel : formatScaleValue(min);
  const highCaption = rightLabel.trim().length > 0 ? rightLabel : formatScaleValue(max);

  const sample = scalesSampleDistribution(question.items, { min, max });
  const rows = question.items.map((statement, index) =>
    buildRow(
      sample.statements[index],
      index,
      statement.label ?? "",
      resolveDatumColor(statement.color, index),
    ),
  );

  // A shared scale across rows: the widest arm reaches the edge, so every other
  // row is read against it rather than against its own maximum.
  const halfDomain = Math.max(50, ...rows.map((row) => Math.max(row.lowExtent, row.highExtent)));
  const trackPercent = (share: number): string =>
    `${((share / (halfDomain * 2)) * 100).toString()}%`;

  const renderArm = (row: DivergingRow, side: "low" | "high", delay: number) => {
    const segments = side === "low" ? row.lowSegments : row.highSegments;
    const extent = side === "low" ? row.lowExtent : row.highExtent;
    return (
      <div
        className={[
          styles.arm,
          side === "low" ? styles.armLow : styles.armHigh,
          revealed ? styles.revealed : "",
        ]
          .filter(Boolean)
          .join(" ")}
        style={{ width: trackPercent(extent), transitionDelay: `${delay.toString()}ms` }}
        aria-hidden="true"
      >
        {segments
          .filter((segment) => segment.share > 0)
          .map((segment) => (
            <span
              key={segment.key}
              className={[styles.segment, BUCKET_CLASSES[segment.bucketIndex]].join(" ")}
              style={{ flexGrow: segment.share }}
              title={`${formatScaleValue(segment.from)}–${formatScaleValue(segment.to)}: ${segment.count.toString()} of ${row.total.toString()}`}
            />
          ))}
      </div>
    );
  };

  return (
    <SlideContent>
      <SlideContentSection>
        <SlideContentSection.Header>
          <span>How the crowd rated each statement</span>
          <span className={styles.sampleNote}>{sample.total} sample ratings</span>
        </SlideContentSection.Header>
        <SlideContentSection.Body>
          {rows.length === 0 ? (
            <p className={styles.empty}>Add a statement to preview how its ratings will read.</p>
          ) : (
            <div className={styles.plot}>
              <ul className={styles.rows}>
                {rows.map((row, index) => (
                  <li key={row.id} className={styles.row}>
                    <IndexPill value={row.letter} color={row.color} />
                    <span className={[styles.armValue, styles.armValueLow].join(" ")}>
                      {asPercent(row.lowShare)}
                    </span>
                    <div
                      className={styles.track}
                      role="img"
                      aria-label={`${row.label.trim().length > 0 ? row.label : `Statement ${row.letter}`}: ${asPercent(row.lowShare)} toward ${lowCaption}, ${asPercent(row.midShare)} in the middle, ${asPercent(row.highShare)} toward ${highCaption}, of ${row.total.toString()} sample ratings`}
                    >
                      <span className={styles.baseline} aria-hidden="true" />
                      {renderArm(row, "low", index * ROW_STAGGER_MS)}
                      {renderArm(row, "high", index * ROW_STAGGER_MS)}
                    </div>
                    <span className={[styles.armValue, styles.armValueHigh].join(" ")}>
                      {asPercent(row.highShare)}
                    </span>
                  </li>
                ))}
              </ul>

              <div className={styles.axis}>
                <div className={styles.axisEnds}>
                  <span>{lowCaption}</span>
                  <span>{highCaption}</span>
                </div>
              </div>

              <ul className={styles.bucketLegend}>
                {sample.bounds.map((bound) => (
                  <li key={bound.index} className={styles.bucketLegendItem}>
                    <span
                      className={[styles.bucketSwatch, BUCKET_CLASSES[bound.index]].join(" ")}
                      aria-hidden="true"
                    />
                    {formatScaleValue(bound.from)}–{formatScaleValue(bound.to)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </SlideContentSection.Body>
      </SlideContentSection>

      <ScalesStatementsSection {...props} />
    </SlideContent>
  );
};

const DivergingBar = withChartErrorBoundary("diverging-bar", DivergingBarInner);

export { DivergingBar };
