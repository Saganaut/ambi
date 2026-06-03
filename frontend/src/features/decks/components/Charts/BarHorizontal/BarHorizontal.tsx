// Horizontal bar visualisation for categorical distributions (MCQ option
// counts, ranking shares, allocation buckets). Bars are sized as a percentage
// of the largest value so a dominant answer doesn't squash the rest. When
// `animateOnMount` is set the bars grow from 0 to their target width with a
// staggered delay — used by ChartPreview for the on-hover demo; production
// callers leave it off so re-renders during a live round don't replay the
// animation on every count update.
import { useEffect, useState } from "react";
import type { ChartDatum } from "../types";
import styles from "./BarHorizontal.module.css";

export interface BarHorizontalProps {
  items: ChartDatum[];
  total?: number;
  caption?: string;
  animateOnMount?: boolean;
}

const BarHorizontal = ({
  items,
  total,
  caption,
  animateOnMount = false,
}: BarHorizontalProps) => {
  const max = Math.max(1, ...items.map((b) => b.value));
  const denominator = total ?? items.reduce((sum, b) => sum + b.value, 0);

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

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <ul className={styles.bars}>
        {items.map((b, i) => {
          const widthPct = revealed ? (b.value / max) * 100 : 0;
          const sharePct =
            denominator > 0 ? Math.round((b.value / denominator) * 100) : 0;
          const delay = `${(i * 70).toString()}ms`;
          return (
            <li
              // eslint-disable-next-line react-x/no-array-index-key -- bar position is the identity
              key={i}
              className={`${styles.row} ${b.highlight ? styles.highlight : ""}`}>
              <span className={styles.label}>{b.label}</span>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{
                    width: `${widthPct.toFixed(1)}%`,
                    transitionDelay: delay,
                  }}
                />
              </div>
              <span
                className={styles.value}
                style={{
                  opacity: revealed ? 1 : 0,
                  transitionDelay: delay,
                }}>
                {b.value}
                {denominator > 0 && (
                  <span className={styles.share}> ({sharePct}%)</span>
                )}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export { BarHorizontal };
