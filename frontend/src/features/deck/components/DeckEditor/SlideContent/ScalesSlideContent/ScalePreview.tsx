// Live "what the player sees" preview for the Scale settings card: the tick
// track that joins the two endpoint cards, plus a compact "min → max · step"
// caption. Purely presentational — the dots are decorative (the caption
// carries the numbers), so the track itself is hidden from assistive tech.
import { scaleTicks } from "./scaleTicks";
import styles from "./ScalesSlideContent.module.css";

interface ScalePreviewProps {
  min: number;
  max: number;
  step: number;
}

/** Dots drawn when the range is too dense or degenerate to show one per tick. */
const FALLBACK_DOT_COUNT = 5;

const ScalePreview = ({ min, max, step }: ScalePreviewProps) => {
  const ticks = scaleTicks(min, max, step);
  const dotCount = ticks.length > 0 ? ticks.length : FALLBACK_DOT_COUNT;

  return (
    <div className={styles.trackPreview}>
      <div className={styles.trackDots} aria-hidden='true'>
        <div className={styles.trackLine} />
        {Array.from({ length: dotCount }, (_, i) => (
          <span
            key={i}
            className={[
              styles.trackDot,
              i === 0 ? styles.trackDotStart : "",
              i === dotCount - 1 ? styles.trackDotEnd : "",
            ]
              .filter(Boolean)
              .join(" ")}
          />
        ))}
      </div>
      <span className={styles.trackCaption}>
        {min} → {max} · step {step}
      </span>
    </div>
  );
};

export { ScalePreview };
