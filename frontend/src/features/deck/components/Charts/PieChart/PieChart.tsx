// Pie chart visualisation for share-of-total distributions (MCQ, ranking,
// allocation). Implemented with stacked SVG <circle> strokes rather than
// arc paths so each slice can animate cleanly via `stroke-dasharray`
// (transitionable in CSS — arc-`d` is not). Each circle's stroke covers
// the full radius (`stroke-width = 2 * r`), turning the donut trick into a
// solid pie. Legend below the wheel mirrors slice order and tint.
import { useEffect, useState } from "react";
import type { ChartDatum } from "../types";
import styles from "./PieChart.module.css";

export interface PieChartProps {
  items: ChartDatum[];
  caption?: string;
  animateOnMount?: boolean;
}

const TONES = ["tone0", "tone1", "tone2", "tone3", "tone4"] as const;

const PieChart = ({ items, caption, animateOnMount = false }: PieChartProps) => {
  const total = items.reduce((sum, b) => sum + b.value, 0);

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
        <p className={styles.empty}>No data.</p>
      </div>
    );
  }

  const slices = items.reduce<
    { label: string; pct: number; start: number; tone: string; index: number }[]
  >((acc, d, i) => {
    const pct = (d.value / total) * 100;
    const start = acc.length === 0 ? 0 : acc[acc.length - 1].start + acc[acc.length - 1].pct;
    acc.push({ label: d.label, pct, start, tone: TONES[i % TONES.length], index: i });
    return acc;
  }, []);

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <div className={styles.body}>
        <svg
          className={styles.svg}
          viewBox='0 0 100 100'
          role='img'
          aria-label='Pie chart'>
          <circle
            className={styles.backdrop}
            cx='50'
            cy='50'
            r='49'
          />
          <g transform='rotate(-90 50 50)'>
            {slices.map((s) => (
              <circle
                key={s.index}
                className={`${styles.slice} ${styles[s.tone]}`}
                cx='50'
                cy='50'
                r='25'
                pathLength={100}
                strokeDasharray={`${(revealed ? s.pct : 0).toFixed(3)} 100`}
                strokeDashoffset={(-s.start).toFixed(3)}
                style={{
                  transitionDelay: `${(s.index * 90).toString()}ms`,
                }}
              />
            ))}
          </g>
        </svg>
        <ul className={styles.legend}>
          {slices.map((s) => (
            <li key={s.index} className={styles.legendItem}>
              <span
                className={`${styles.swatch} ${styles[s.tone]}`}
                aria-hidden='true'
              />
              <span className={styles.legendLabel}>{s.label}</span>
              <span className={styles.legendValue}>{Math.round(s.pct)}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export { PieChart };
