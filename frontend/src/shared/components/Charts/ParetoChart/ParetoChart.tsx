// Pareto chart: bars sorted by descending value with a cumulative-percentage
// line overlaid (the classic "80/20" view). Bars are scaled to the largest
// value; the cumulative line runs 0→100% on the same canvas. Useful for MCQ
// option counts when the author wants to see how few options capture most of
// the responses. Pure SVG (bars + polyline) with the category labels listed
// below in the sorted order.
import type { ChartProps } from "../types";
import styles from "./ParetoChart.module.css";

export type ParetoChartProps = ChartProps;

const W = 100;
const H = 60;
const PAD = 6;

const ParetoChart = ({ data, caption, renderLabel }: ParetoChartProps) => {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const total = sorted.reduce((sum, d) => sum + d.value, 0);
  const max = Math.max(1, ...sorted.map((d) => d.value));
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const slot = plotW / Math.max(1, sorted.length);
  const barW = slot * 0.6;

  let running = 0;
  const items = sorted.map((d, i) => {
    running += d.value;
    const cumPct = total > 0 ? running / total : 0;
    const cx = PAD + slot * i + slot / 2;
    return {
      datum: d,
      index: i,
      barX: cx - barW / 2,
      barH: (d.value / max) * plotH,
      cumX: cx,
      cumY: H - PAD - cumPct * plotH,
      cumPct,
    };
  });

  const linePath = items
    .map((it) => `${it.cumX.toFixed(2)},${it.cumY.toFixed(2)}`)
    .join(" ");

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W.toString()} ${H.toString()}`}
        preserveAspectRatio='none'
        role='img'
        aria-label='Pareto chart'
      >
        <line
          className={styles.axis}
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        {items.map((it) => (
          <rect
            key={it.index}
            className={`${styles.bar} ${
              it.datum.highlight ? styles.highlight : ""
            }`}
            x={it.barX}
            y={H - PAD - it.barH}
            width={barW}
            height={it.barH}
            style={it.datum.color ? { fill: it.datum.color } : undefined}
          />
        ))}
        {items.length > 1 && (
          <polyline className={styles.cumLine} points={linePath} />
        )}
        {items.map((it) => (
          <circle
            key={it.index}
            className={styles.cumMarker}
            cx={it.cumX}
            cy={it.cumY}
            r={1.4}
          />
        ))}
      </svg>
      <ul className={styles.labels}>
        {items.map((it) => (
          <li key={it.index} className={styles.label}>
            {renderLabel ? (
              renderLabel(it.datum)
            ) : (
              <span className={styles.labelText}>{it.datum.label}</span>
            )}
            <span className={styles.labelValue}>
              {Math.round(it.cumPct * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { ParetoChart };
