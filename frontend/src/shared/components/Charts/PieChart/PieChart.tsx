import { useEffect, useState } from "react";
import type { ChartDatum, GeneralChartProps } from "../types";
import styles from "./PieChart.module.css";

const TONES = ["tone0", "tone1", "tone2", "tone3", "tone4"] as const;

// Pie: stroke covers the whole radius (r=25, width=50). Donut: a band.
const RADII = { pie: 25, donut: 38 } as const;
const STROKE = { pie: 50, donut: 16 } as const;

const PieChart = ({
  data,
  variant = "pie",
  caption,
  animateOnMount = true,
  renderLabel,
  renderToggle,
  renderMenu,
  renderDragHandle,
  displayAsPercentage = false,
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
          {slices.map((s) => (
            <li
              key={s.index}
              className={`${styles.legendItem} ${s.highlight ? styles.highlight : ""}`}
            >
              <span
                className={`${styles.swatch} ${styles[s.tone]}`}
                style={s.color ? { background: s.color } : undefined}
                aria-hidden="true"
              />
              <div className={styles.optionControls}>
                {renderDragHandle?.(s.datum)}
                {renderLabel ? (
                  renderLabel(s.datum)
                ) : (
                  <span className={styles.legendLabel}>{s.label}</span>
                )}
                {renderToggle?.(s.datum)}
                {renderMenu?.(s.datum)}
              </div>
              <span className={styles.legendValue}>
                {s.datum.value}
                {displayAsPercentage && ` (${Math.round(s.pct).toString()}%)`}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { PieChart };
