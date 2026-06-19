// Line chart over an ordered set of categories (MCQ options in author order,
// score-over-rounds, …). Values map to a polyline with a marker per point; the
// y-axis is scaled to the largest value. A highlighted datum gets an emphasised
// marker. Pure SVG so it scales with its container and animates via CSS.
import type { ChartProps } from "../types";
import styles from "./LineChart.module.css";

export type LineChartProps = ChartProps;

const W = 100;
const H = 60;
const PAD = 6;

const LineChart = ({ data, caption, renderLabel }: LineChartProps) => {
  const max = Math.max(1, ...data.map((d) => d.value));
  const span = Math.max(1, data.length - 1);

  const points = data.map((d, i) => {
    const x = PAD + (i / span) * (W - PAD * 2);
    const y = H - PAD - (d.value / max) * (H - PAD * 2);
    return { x, y, datum: d, index: i };
  });

  const path = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <svg
        className={styles.svg}
        viewBox={`0 0 ${W.toString()} ${H.toString()}`}
        preserveAspectRatio='none'
        role='img'
        aria-label='Line chart'
      >
        <line
          className={styles.axis}
          x1={PAD}
          y1={H - PAD}
          x2={W - PAD}
          y2={H - PAD}
        />
        {data.length > 1 && (
          <polyline className={styles.line} points={path} />
        )}
        {points.map((p) => (
          <circle
            key={p.index}
            className={`${styles.marker} ${
              p.datum.highlight ? styles.highlight : ""
            }`}
            cx={p.x}
            cy={p.y}
            r={p.datum.highlight ? 2.4 : 1.8}
            style={p.datum.color ? { fill: p.datum.color } : undefined}
          />
        ))}
      </svg>
      <ul className={styles.labels}>
        {data.map((d, i) => (
          <li
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={i}
            className={styles.label}
          >
            {renderLabel ? (
              renderLabel(d)
            ) : (
              <span className={styles.labelText}>{d.label}</span>
            )}
            <span className={styles.labelValue}>{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { LineChart };
