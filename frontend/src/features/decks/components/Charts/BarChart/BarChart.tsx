/**
 * Horizontal bar chart for small categorical distributions (MCQ option counts,
 * round-by-round score deltas, etc.). Each bar is sized as a percentage of the
 * largest value so a single dominant answer doesn't make the others invisible.
 * Optionally one bar can be highlighted (used to mark the correct MCQ option).
 */
import styles from "./BarChart.module.css";

export interface BarChartItem {
  label: string;
  value: number;
  highlight?: boolean;
}

export interface BarChartProps {
  items: BarChartItem[];
  // Totals are useful for showing percentages alongside the raw count.
  total?: number;
  // Optional label rendered above the bars.
  caption?: string;
}

const BarChart = ({ items, total, caption }: BarChartProps) => {
  const max = Math.max(1, ...items.map((b) => b.value));
  const denominator = total ?? items.reduce((sum, b) => sum + b.value, 0);

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ul className={styles.bars}>
        {items.map((b, i) => {
          const widthPct = (b.value / max) * 100;
          const sharePct = denominator > 0 ? Math.round((b.value / denominator) * 100) : 0;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- bar position is the identity
              key={i}
              className={`${styles.row} ${b.highlight ? styles.highlight : ""}`}>
              <span className={styles.label}>{b.label}</span>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{ width: `${widthPct.toFixed(1)}%` }}
                />
              </div>
              <span className={styles.value}>
                {b.value}
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
