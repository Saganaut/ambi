import { useSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, useState } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import { AddOptionButton } from "../AddOptionButton/AddOptionButton";
import type { ChartDatum, ChartProps, ChartSegmentRenderProps } from "../Chart.types";
import { OptionImage } from "../OptionImage/OptionImage";
import { resolveDatumColor } from "../optionPalette";
import styles from "./PieChart.module.css";

// Pie: stroke covers the whole radius (r=25, width=50). Donut: a band.
const RADII = { pie: 25, donut: 38 } as const;
const STROKE = { pie: 50, donut: 16 } as const;

type PieChartSegmentRenderProps = ChartSegmentRenderProps;

const PieChartSegment = ({
  sortIndex,
  datum,
  denominator,
  displayAsPercentage,
  renderLabel,
  renderToggle,
  renderMenu,
}: PieChartSegmentRenderProps) => {
  const pct = denominator > 0 ? (datum.value / denominator) * 100 : 0;

  const { ref: sortableRef } = useSortable({
    id: datum.id,
    index: sortIndex,
  });

  const cardRef = useRef<HTMLLIElement>(null);

  const setCardRef = (node: HTMLLIElement | null) => {
    cardRef.current = node;
    if (typeof sortableRef === "function") sortableRef(node);
  };

  return (
    <li
      ref={setCardRef}
      className={`${styles.legendItem} ${datum.highlight ? styles.highlight : ""}`}
    >
      <span
        className={styles.swatch}
        style={{ background: resolveDatumColor(datum.color, sortIndex) }}
        aria-hidden="true"
      />
      <OptionImage src={datum.imageUrl} alt={datum.imageAlt} />
      <div className={styles.optionControls}>
        {renderLabel ? (
          renderLabel(datum)
        ) : (
          <span className={styles.legendLabel}>{datum.text ?? ""}</span>
        )}
      </div>
      <span className={styles.legendValue}>
        {datum.value}
        {displayAsPercentage && ` (${Math.round(pct).toString()}%)`}
      </span>
      {(renderToggle ?? renderMenu) && (
        <span className={styles.legendActions}>
          {renderToggle?.(datum)}
          {renderMenu?.(datum)}
        </span>
      )}
    </li>
  );
};

const PieChart = ({
  variant = "pie",
  renderLabel,
  renderToggle,
  renderMenu,
  onReorder,
  data,
  displayAsPercentage,
  animateOnMount = false,
  addOption,
  canAddOption,
}: ChartProps) => {
  useEffect(() => {
    if (!animateOnMount) return;
    const id = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [animateOnMount]);
  const [revealed, setRevealed] = useState(!animateOnMount);

  const total = data.reduce((sum, datum) => sum + datum.value, 0);

  if (total === 0) {
    return (
      <div className={styles.chart}>
        <p className={styles.empty}>No responses yet.</p>
      </div>
    );
  }
  const slices = data.reduce<
    {
      datum: ChartDatum;
      pct: number;
      start: number;
      color: string;
      index: number;
    }[]
  >((acc, datum, index) => {
    const pct = (datum.value / total) * 100;
    const start = acc.length === 0 ? 0 : acc[acc.length - 1].start + acc[acc.length - 1].pct;
    acc.push({
      datum,
      pct,
      start,
      color: resolveDatumColor(datum.color, index),
      index,
    });
    return acc;
  }, []);

  // pathLength's scaling shortfall accumulates at the circle's closure, so the
  // slices leave a background-colored sliver at the 12 o'clock seam. The guard
  // is a copy of the last slice extended 1 unit past the path end — dashes
  // wrap on closed paths, so it fills the seam from beneath (it is painted
  // first; the real slices cover everything else).
  const lastSlice = slices[slices.length - 1];

  return (
    <div className={styles.chart}>
      <div className={styles.body}>
        <div className={styles.plot}>
          <svg
            className={styles.svg}
            viewBox="0 0 100 100"
            role="img"
            aria-label={variant === "donut" ? "Donut chart" : "Pie chart"}
          >
            <circle className={styles.backdrop} cx="50" cy="50" r="49" />
            <g transform="rotate(-90 50 50)">
              <circle
                className={styles.slice}
                cx="50"
                cy="50"
                r={RADII[variant]}
                pathLength={100}
                strokeWidth={STROKE[variant]}
                stroke={lastSlice.color}
                strokeDasharray={`${(revealed ? lastSlice.pct + 1 : 0).toFixed(3)} 100`}
                strokeDashoffset={(-lastSlice.start).toFixed(3)}
                style={{
                  transitionDelay: !revealed ? `${(lastSlice.index * 90).toString()}ms` : undefined,
                }}
              />
              {slices.map((slice) => (
                <circle
                  key={slice.index}
                  className={styles.slice}
                  cx="50"
                  cy="50"
                  r={RADII[variant]}
                  pathLength={100}
                  strokeWidth={STROKE[variant]}
                  stroke={slice.color}
                  strokeDasharray={`${(revealed ? slice.pct : 0).toFixed(3)} 100`}
                  strokeDashoffset={(-slice.start).toFixed(3)}
                  style={{
                    transitionDelay: !revealed ? `${(slice.index * 90).toString()}ms` : undefined,
                  }}
                />
              ))}
            </g>
          </svg>
        </div>
        <ul className={styles.legend}>
          <DragDropWrapper onReorder={onReorder}>
            {slices.map((slice, index) => (
              <PieChartSegment
                key={slice.datum.id}
                datum={slice.datum}
                denominator={total}
                displayAsPercentage={displayAsPercentage}
                sortIndex={index}
                renderToggle={renderToggle}
                renderLabel={renderLabel}
                renderMenu={renderMenu}
              />
            ))}
          </DragDropWrapper>
          {addOption && canAddOption && (
            <li className={styles.addSlot}>
              <AddOptionButton onClick={addOption} />
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};

export { PieChart };
