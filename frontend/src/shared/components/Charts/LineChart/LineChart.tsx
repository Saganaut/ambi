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

  const points = data.map((datum, index) => {
    const x = PAD + (index / span) * (W - PAD * 2);
    const y = H - PAD - (datum.value / max) * (H - PAD * 2);
    return { x, y, datum, index };
  });

  // W === 100, so viewBox x directly equals the CSS left percentage; y maps to
  // the top percentage via H.
  const xPct = (index: number) => PAD + (index / span) * (W - PAD * 2);
  const yPct = (y: number) => (y / H) * 100;

  // Anchors in the right half open their menu popover leftward so it stays
  // inside the canvas.
  const menuAlignFor = (index: number) => (index > (data.length - 1) / 2 ? "end" : "start");

  const path = points.map((point) => `${point.x.toFixed(2)},${point.y.toFixed(2)}`).join(" ");

  return (
    <div className={styles.chart} style={{ "--n": data.length } as React.CSSProperties}>
      <div className={styles.valueRow}>
        {data.map((datum, index) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={index}
            className={styles.valueItem}
            style={{ left: `${xPct(index).toFixed(2)}%` }}
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
        {points.map((point) => (
          <span
            key={point.index}
            className={`${styles.marker} ${point.datum.highlight ? styles.highlight : ""}`}
            style={{
              left: `${point.x.toFixed(2)}%`,
              top: `${yPct(point.y).toFixed(2)}%`,
              background: resolveDatumColor(point.datum.color, point.index),
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
        {data.map((datum, index) => (
          <div
            // eslint-disable-next-line react-x/no-array-index-key -- position is the identity
            key={index}
            className={styles.controlsItem}
            style={{ left: `${xPct(index).toFixed(2)}%` }}
          >
            <div className={styles.optionControls}>
              {renderLabel ? (
                <>
                  {renderLabel(datum)} {renderMenu?.(datum, menuAlignFor(index))}
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
