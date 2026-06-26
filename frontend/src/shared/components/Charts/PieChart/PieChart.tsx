import { useSortable } from "@dnd-kit/react/sortable";
import { useEffect, useRef, useState } from "react";
import { DragDropWrapper } from "../../Wrappers/DragDropWrapper";
import type { ChartDatum, ChartProps, ChartSegmentRenderProps } from "../types";
import styles from "./PieChart.module.css";

const TONES = ["tone0", "tone1", "tone2", "tone3", "tone4"] as const;

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
  const tone = TONES[sortIndex % TONES.length];
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
        className={`${styles.swatch} ${styles[tone]}`}
        style={datum.color ? { background: datum.color } : undefined}
        aria-hidden="true"
      />
      <div className={styles.optionControls}>
        {renderLabel ? (
          renderLabel(datum)
        ) : (
          <span className={styles.legendLabel}>{datum.text ?? ""}</span>
        )}
        {renderToggle?.(datum)}
        {renderMenu?.(datum)}
      </div>
      <span className={styles.legendValue}>
        {datum.value}
        {displayAsPercentage && ` (${Math.round(pct).toString()}%)`}
      </span>
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

  console.log("TODO: canAddOption, addOption, isCorrect per option");

  const total = data.reduce((sum, d) => sum + d.value, 0);

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
      label: string;
      pct: number;
      start: number;
      tone: string;
      color?: string;
      highlight?: boolean;
      index: number;
    }[]
  >((acc, d, i) => {
    const pct = (d.value / total) * 100;
    const start = acc.length === 0 ? 0 : acc[acc.length - 1].start + acc[acc.length - 1].pct;
    acc.push({
      datum: d,
      label: d.text ?? "",
      pct,
      start,
      tone: TONES[i % TONES.length],
      color: d.color,
      highlight: d.highlight,
      index: i,
    });
    return acc;
  }, []);

  return (
    <div className={styles.chart}>
      <div className={styles.body}>
        <svg
          className={styles.svg}
          viewBox="0 0 100 100"
          role="img"
          aria-label={variant === "donut" ? "Donut chart" : "Pie chart"}
        >
          <circle className={styles.backdrop} cx="50" cy="50" r="49" />
          <g transform="rotate(-90 50 50)">
            {slices.map((s) => (
              <circle
                key={s.index}
                className={`${styles.slice} ${styles[s.tone]} ${
                  s.highlight ? styles.highlight : ""
                }`}
                cx="50"
                cy="50"
                r={RADII[variant]}
                pathLength={100}
                strokeWidth={STROKE[variant]}
                stroke={s.color}
                strokeDasharray={`${(revealed ? s.pct : 0).toFixed(3)} 100`}
                strokeDashoffset={(-s.start).toFixed(3)}
                style={{
                  transitionDelay: !revealed ? `${(s.index * 90).toString()}ms` : undefined,
                }}
              />
            ))}
          </g>
        </svg>
        <ul className={styles.legend}>
          <DragDropWrapper onReorder={onReorder}>
            {slices.map((s, idx) => (
              <PieChartSegment
                key={s.datum.id}
                datum={s.datum}
                denominator={total}
                displayAsPercentage={displayAsPercentage}
                sortIndex={idx}
                renderToggle={renderToggle}
                renderLabel={renderLabel}
                renderMenu={renderMenu}
              />
            ))}
          </DragDropWrapper>
        </ul>
      </div>
    </div>
  );
};

export { PieChart };
