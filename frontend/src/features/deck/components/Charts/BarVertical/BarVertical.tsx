// Vertical bar visualisation — same input shape as BarHorizontal but laid
// out as columns side-by-side, suited to wider chart frames (NumberQuestion
// bin distributions, ScalesQuestion responses per statement). Bars rise from
// the baseline on mount when `animateOnMount` is set; live presenter views
// leave it off.
import { useEffect, useState } from "react";
import type { ChartDatum } from "../types";
import styles from "./BarVertical.module.css";

export interface BarVerticalProps {
  items: ChartDatum[];
  total?: number;
  caption?: string;
  animateOnMount?: boolean;
}

const BarVertical = ({
  items,
  total,
  caption,
  animateOnMount = false,
}: BarVerticalProps) => {
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
      <div className={styles.bars}>
        {items.map((b, i) => {
          const heightPct = revealed ? (b.value / max) * 100 : 0;
          const sharePct =
            denominator > 0 ? Math.round((b.value / denominator) * 100) : 0;
          const delay = `${(i * 70).toString()}ms`;
          return (
            <div
              // eslint-disable-next-line react-x/no-array-index-key -- bar position is the identity
              key={i}
              className={`${styles.column} ${b.highlight ? styles.highlight : ""}`}>
              <span
                className={styles.value}
                style={{
                  opacity: revealed ? 1 : 0,
                  transitionDelay: delay,
                }}>
                {b.value}
                {denominator > 0 && (
                  <span className={styles.share}>{sharePct}%</span>
                )}
              </span>
              <div className={styles.track}>
                <div
                  className={styles.fill}
                  style={{
                    height: `${heightPct.toFixed(1)}%`,
                    transitionDelay: delay,
                  }}
                />
              </div>
              <span className={styles.label} title={b.label}>
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export { BarVertical };
