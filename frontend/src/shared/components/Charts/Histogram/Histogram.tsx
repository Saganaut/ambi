// Histogram of a continuous distribution: each datum is a bin (`text` = the bin
// label, `value` = the count in that bin). Bars are drawn gapless — touching bars
// are what visually distinguish a histogram from `BAR_VERTICAL`'s spaced columns.
// Consumes the same `ChartProps`/`ChartDatum[]` contract as every other results
// chart, so it slots straight into the dispatcher + preview pipeline; the MCQ-only
// editor render props (`renderLabelWithMenu`, `onReorder`, …) are accepted but unused here.
import type { ChartProps } from "../Chart.types";
import styles from "./Histogram.module.css";

export type HistogramProps = ChartProps;

const Histogram = ({ data, displayAsPercentage }: HistogramProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));

  return (
    <div className={styles.chart}>
      <ul className={styles.bins}>
        {data.map((datum, i) => {
          const heightPct = (datum.value / max) * 100;
          const sharePct = denominator > 0 ? Math.round((datum.value / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- bin position is the identity
              key={i}
              className={`${styles.bin} ${datum.highlight ? styles.highlight : ""}`}
            >
              <span className={styles.value}>
                {datum.value}
                {displayAsPercentage && denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
              <div className={styles.track}>
                <span
                  className={styles.fill}
                  style={
                    {
                      height: `${heightPct.toFixed(1)}%`,
                      "--bar-color": datum.color,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.label}>{datum.text ?? ""}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { Histogram };
