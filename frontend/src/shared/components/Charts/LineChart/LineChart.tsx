import { AddOptionButton } from "../AddOptionButton/AddOptionButton";
import type { ChartProps } from "../Chart.types";
import { resolveDatumColor } from "../optionPalette";
import styles from "./LineChart.module.css";

export type LineChartProps = ChartProps;

const W = 100;
const H = 60;
const PAD = 6;

const LineChart = ({
  renderLabel,
  renderToggle,
  renderMenu,
  data,
  displayAsPercentage,
  addOption,
  canAddOption,
}: LineChartProps) => {
  const denominator = data.reduce((sum, datum) => sum + datum.value, 0);
  const max = Math.max(1, ...data.map((datum) => datum.value));
  const span = Math.max(1, data.length - 1);

  const points = data.map((datum, i) => {
    const x = PAD + (i / span) * (W - PAD * 2);
    const y = H - PAD - (datum.value / max) * (H - PAD * 2);
    return { x, y, datum, index: i };
  });

  // W === 100, so viewBox x directly equals the CSS left percentage; y maps to
  // the top percentage via H.
  const xPct = (i: number) => PAD + (i / span) * (W - PAD * 2);
  const yPct = (y: number) => (y / H) * 100;

  const path = points.map((p) => `${p.x.toFixed(2)},${p.y.toFixed(2)}`).join(" ");

  return (
    <div className={styles.chart} style={{ "--n": data.length } as React.CSSProperties}>
      <div className={styles.valueRow}>
        {data.map((datum, i) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={i}
            className={styles.valueItem}
            style={{ left: `${xPct(i).toFixed(2)}%` }}
          >
            <span className={styles.labelValue}>
              {datum.value}
              {displayAsPercentage && denominator > 0 && (
                <span className={styles.share}>
                  {" "}
                  ({Math.round((datum.value / denominator) * 100)}%)
                </span>
              )}{" "}
              {renderToggle?.(datum)}
            </span>
          </div>
        ))}
      </div>
      {/* The SVG stretches to fill (preserveAspectRatio="none"); strokes stay
          uniform via non-scaling-stroke and the markers are HTML dots overlaid
          by percentage so they can't be distorted by the stretch. */}
      <div className={styles.plot}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${W.toString()} ${H.toString()}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Line chart"
        >
          <line className={styles.axis} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
          {data.length > 1 && <polyline className={styles.line} points={path} />}
        </svg>
        {points.map((p) => (
          <span
            key={p.index}
            className={`${styles.marker} ${p.datum.highlight ? styles.highlight : ""}`}
            style={{
              left: `${p.x.toFixed(2)}%`,
              top: `${yPct(p.y).toFixed(2)}%`,
              background: resolveDatumColor(p.datum.color, p.index),
            }}
            aria-hidden="true"
          />
        ))}
        {addOption && canAddOption && (
          <span className={styles.addSlot}>
            <AddOptionButton onClick={addOption} />
          </span>
        )}
      </div>
      <div className={styles.controlsRow}>
        {data.map((datum, i) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={i}
            className={styles.controlsItem}
            style={{ left: `${xPct(i).toFixed(2)}%` }}
          >
            <div className={styles.optionControls}>
              {renderLabel ? (
                <>
                  {renderLabel(datum)} {renderMenu?.(datum)}
                </>
              ) : (
                <span className={styles.labelText}>{datum.text ?? ""}</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { LineChart };
