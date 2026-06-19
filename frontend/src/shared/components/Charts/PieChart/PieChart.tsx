import { DragDropProvider } from "@dnd-kit/react";
import { useSortable } from "@dnd-kit/react/sortable";
import { ReactNode, useEffect, useRef, useState } from "react";
import type { ChartDatum, GeneralChartProps } from "../types";
import styles from "./PieChart.module.css";

const TONES = ["tone0", "tone1", "tone2", "tone3", "tone4"] as const;

// Pie: stroke covers the whole radius (r=25, width=50). Donut: a band.
const RADII = { pie: 25, donut: 38 } as const;
const STROKE = { pie: 50, donut: 16 } as const;

interface SortableListItem {
  sortIndex: number;
  sliceId: string;
  renderLabel?: (datum: ChartDatum) => ReactNode;
  /** The correct/incorrect toggle. */
  renderToggle?: (datum: ChartDatum) => ReactNode;
  /** The option's menu (image/colour/remove). */
  renderMenu?: (datum: ChartDatum) => ReactNode;
  displayAsPercentage: boolean;
  slice: {
    datum: ChartDatum;
    label: string;
    pct: number;
    start: number;
    tone: string;
    color?: string;
    highlight?: boolean;
    index: number;
  };
}

const SortableListItem = ({
  sortIndex,
  sliceId,
  renderLabel,
  renderToggle,
  renderMenu,
  displayAsPercentage,
  slice,
}: SortableListItem) => {
  const { ref: sortableRef } = useSortable({
    id: sliceId,
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
      key={slice.datum.id}
      className={`${styles.legendItem} ${slice.highlight ? styles.highlight : ""}`}
    >
      <span
        className={`${styles.swatch} ${styles[slice.tone]}`}
        style={slice.color ? { background: slice.color } : undefined}
        aria-hidden="true"
      />
      <div className={styles.optionControls}>
        {renderLabel ? (
          renderLabel(slice.datum)
        ) : (
          <span className={styles.legendLabel}>{slice.label}</span>
        )}
        {renderToggle?.(slice.datum)}
        {renderMenu?.(slice.datum)}
      </div>
      <span className={styles.legendValue}>
        {slice.datum.value}
        {displayAsPercentage && ` (${Math.round(slice.pct).toString()}%)`}
      </span>
    </li>
  );
};

const PieChart = ({
  data,
  variant = "pie",
  caption,
  animateOnMount = true,
  renderLabel,
  renderToggle,
  renderMenu,
  displayAsPercentage = false,
  handleOptionDragEnd,
  chartMode,
}: GeneralChartProps) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const [revealed, setRevealed] = useState(!animateOnMount);
  useEffect(() => {
    if (!animateOnMount) return;
    const id = requestAnimationFrame(() => {
      setRevealed(true);
    });
    return () => {
      cancelAnimationFrame(id);
    };
  }, [animateOnMount]);

  if (total === 0) {
    return (
      <div className={styles.chart}>
        {caption && <div className={styles.caption}>{caption}</div>}
        <p className={styles.empty}>No responses yet.</p>
      </div>
    );
  }
  if (chartMode !== "editable") return;
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
      {caption && <div className={styles.caption}>{caption}</div>}
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
                style={{ transitionDelay: `${(s.index * 90).toString()}ms` }}
              />
            ))}
          </g>
        </svg>
        <ul className={styles.legend}>
          <DragDropProvider
            onDragEnd={(event) => {
              handleOptionDragEnd(event);
            }}
          >
            {slices.map((s, idx) => (
              <SortableListItem
                key={s.datum.id}
                sliceId={s.datum.id}
                slice={s}
                displayAsPercentage={displayAsPercentage}
                sortIndex={idx}
                renderToggle={renderToggle}
                renderLabel={renderLabel}
                renderMenu={renderMenu}
              />
            ))}
          </DragDropProvider>
        </ul>
      </div>
    </div>
  );
};

export { PieChart };
