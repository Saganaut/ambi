// Word-cloud visualisation for free-text / WordCloudQuestion aggregations.
// Words are sized by their relative frequency (clamped to a sensible scale
// band so a single dominant word doesn't blow out the layout) and tinted by
// their rank using a recurring 5-colour palette. Layout uses flex-wrap +
// center alignment — biggest words land first so the eye anchors there.
// On-mount animation scales each word in with a per-rank stagger.
import { useEffect, useState } from "react";
import type { ChartDatum } from "../types";
import styles from "./WordCloud.module.css";

export interface WordCloudProps {
  items: ChartDatum[];
  caption?: string;
  animateOnMount?: boolean;
}

const MIN_SCALE = 0.7;
const MAX_SCALE = 2.4;

const WordCloud = ({
  items,
  caption,
  animateOnMount = false,
}: WordCloudProps) => {
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

  const sorted = [...items].sort((a, b) => b.value - a.value);
  const max = Math.max(1, ...sorted.map((s) => s.value));
  const min = Math.min(...sorted.map((s) => s.value));
  const range = Math.max(1, max - min);

  return (
    <div className={styles.chart}>
      {caption && <div className={styles.caption}>{caption}</div>}
      <div className={styles.cloud}>
        {sorted.map((w, i) => {
          const t = (w.value - min) / range;
          const scale = MIN_SCALE + t * (MAX_SCALE - MIN_SCALE);
          const delay = `${(i * 50).toString()}ms`;
          return (
            <span
              // eslint-disable-next-line react-x/no-array-index-key -- rank is the identity
              key={i}
              className={[
                styles.word,
                styles[`tone${(i % 5).toString()}`],
                w.highlight ? styles.highlight : "",
              ]
                .filter(Boolean)
                .join(" ")}
              style={{
                fontSize: `${scale.toFixed(2)}em`,
                opacity: revealed ? 1 : 0,
                transform: revealed ? "scale(1)" : "scale(0.4)",
                transitionDelay: delay,
              }}>
              {w.label}
            </span>
          );
        })}
      </div>
    </div>
  );
};

export { WordCloud };
