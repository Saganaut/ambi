// Pareto chart: bars sorted by descending value with a cumulative-percentage
// line overlaid (the classic "80/20" view). Bars are scaled to the largest
// value; the cumulative line runs 0→100% on the same canvas. Useful for MCQ
// option counts when the author wants to see how few options capture most of
// the responses. SVG bars + line (stretched to fill) with HTML dot markers and
// the category labels listed below in the sorted order.
import { AddOptionButton } from "../AddOptionButton/AddOptionButton";
import type { ChartProps } from "../Chart.types";
import { CorrectBadge } from "../CorrectBadge/CorrectBadge";
import { OptionImage } from "../OptionImage/OptionImage";
import { resolveDatumColor } from "../optionPalette";
import styles from "./ParetoChart.module.css";

export type ParetoChartProps = ChartProps;

const W = 100;
const H = 60;
const PAD = 6;

const ParetoChart = ({
  renderLabel,
  renderMenu,
  data,
  addOption,
  canAddOption,
}: ParetoChartProps) => {
  const max = Math.max(1, ...data.map((datum) => datum.value));

  // Keep the author-order index so each option keeps its colour when sorting.
  const sorted = data
    .map((datum, authorIndex) => ({ datum, authorIndex }))
    .sort((first, second) => second.datum.value - first.datum.value);
  const total = sorted.reduce((sum, entry) => sum + entry.datum.value, 0);
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const slot = plotW / Math.max(1, sorted.length);
  const barW = slot * 0.6;

  let running = 0;
  const items = sorted.map(({ datum, authorIndex }, sortedIndex) => {
    running += datum.value;
    const cumPct = total > 0 ? running / total : 0;
    const cx = PAD + slot * sortedIndex + slot / 2;
    return {
      datum,
      index: sortedIndex,
      color: resolveDatumColor(datum.color, authorIndex),
      barX: cx - barW / 2,
      barH: (datum.value / max) * plotH,
      cumX: cx,
      cumY: H - PAD - cumPct * plotH,
      cumPct,
    };
  });

  // Anchors in the right half open their menu popover leftward so it stays
  // inside the canvas.
  const menuAlignFor = (sortedIndex: number) =>
    sortedIndex > (items.length - 1) / 2 ? "end" : "start";

  const linePath = items.map((it) => `${it.cumX.toFixed(2)},${it.cumY.toFixed(2)}`).join(" ");

  return (
    <div className={styles.chart}>
      {/* The SVG stretches to fill (preserveAspectRatio="none"); strokes stay
          uniform via non-scaling-stroke and the cumulative markers are HTML
          dots overlaid by percentage so they can't be distorted. */}
      <div className={styles.plot}>
        <svg
          className={styles.svg}
          viewBox={`0 0 ${W.toString()} ${H.toString()}`}
          preserveAspectRatio="none"
          role="img"
          aria-label="Pareto chart"
        >
          <line className={styles.axis} x1={PAD} y1={H - PAD} x2={W - PAD} y2={H - PAD} />
          {items.map((it) => (
            <rect
              key={it.index}
              className={styles.bar}
              x={it.barX}
              y={H - PAD - it.barH}
              width={barW}
              height={it.barH}
              style={{ fill: it.color }}
            />
          ))}
          {items.length > 1 && <polyline className={styles.cumLine} points={linePath} />}
        </svg>
        {items.map((it) => (
          <span
            key={it.index}
            className={styles.cumMarker}
            style={{
              left: `${it.cumX.toFixed(2)}%`,
              top: `${((it.cumY / H) * 100).toFixed(2)}%`,
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
      <ul className={styles.labels}>
        {items.map((it) => (
          <li
            key={it.index}
            className={`${styles.label} ${it.datum.highlight ? styles.highlight : ""}`}
          >
            <div className={styles.optionControls}>
              <OptionImage src={it.datum.imageUrl} alt={it.datum.imageAlt} />
              {renderLabel ? (
                renderLabel(it.datum)
              ) : (
                <span className={styles.labelText}>{it.datum.text ?? ""}</span>
              )}
            </div>
            <span className={styles.labelStats}>
              <span className={styles.labelValue}>{it.datum.value}</span>
              <span className={styles.labelShare}> · {Math.round(it.cumPct * 100)}%</span>
            </span>
            {renderMenu && (
              <span className={styles.labelActions}>
                <CorrectBadge isCorrect={it.datum.isCorrect} />
                {renderMenu(it.datum, menuAlignFor(it.index))}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};

export { ParetoChart };
