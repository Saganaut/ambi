/**
 * Bar chart for small categorical distributions (MCQ option counts, score
 * deltas, …). Each bar is sized as a percentage of the largest value so a
 * single dominant answer doesn't make the others invisible; the raw count and
 * share-of-total are printed alongside. A highlighted datum (e.g. the correct
 * MCQ option) gets the emphasis fill. Orientation is a prop so the same
 * component serves BAR_HORIZONTAL and BAR_VERTICAL.
 */
import type { ChartDatum } from "../types";
import styles from "./BarChart.module.css";

export interface BarChartProps {
  data: ChartDatum[];
  /** Bars grow left→right ("horizontal") or bottom→top ("vertical"). */
  orientation?: "horizontal" | "vertical";
  /** Denominator for the share %; defaults to the sum of values. */
  total?: number;
  caption?: string;
}

const BarChart = ({
  data,
  orientation = "horizontal",
  total,
  caption,
}: BarChartProps) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const denominator = total ?? data.reduce((sum, d) => sum + d.value, 0);

  return (
    <div className={`${styles.chart} ${styles[orientation]}`}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ul className={styles.bars}>
        {data.map((d, i) => {
          const sizePct = (d.value / max) * 100;
          const sharePct =
            denominator > 0 ? Math.round((d.value / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- bar position is the identity
              key={i}
              className={`${styles.row} ${d.highlight ? styles.highlight : ""}`}
            >
              <span className={styles.label}>{d.label}</span>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={
                    {
                      "--size": `${sizePct.toFixed(1)}%`,
                      "--bar-color": d.color,
                    } as React.CSSProperties
                  }
                />
              </div>
              <span className={styles.value}>
                {d.value}
                {denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { BarChart };
