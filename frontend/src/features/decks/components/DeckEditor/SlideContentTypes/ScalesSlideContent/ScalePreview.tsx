// Visual "what the player sees" preview for the Scales editor. Renders the
// configured tick range with the anchor labels at each end so the author can
// sanity-check min/max and label wording before saving. Stays purely
// presentational — no inputs, no state.
import styles from "./ScalesSlideContent.module.css";

interface ScalePreviewProps {
  min: number;
  max: number;
  minLabel?: string;
  maxLabel?: string;
}

const ScalePreview = ({ min, max, minLabel, maxLabel }: ScalePreviewProps) => {
  const safeMin = Math.min(min, max);
  const safeMax = Math.max(min, max);
  const span = safeMax - safeMin;
  // Cap tick rendering so weird inputs (say, 1–200) don't explode the DOM.
  const tickCount = span >= 0 && span <= 20 ? span + 1 : 0;
  const ticks = Array.from({ length: tickCount }, (_, i) => safeMin + i);

  return (
    <div className={styles.scalePreview}>
      <span className={styles.scaleLabel}>
        {minLabel && minLabel.length > 0 ? minLabel : safeMin.toString()}
      </span>
      <div className={styles.scaleTrack}>
        {ticks.length > 0 ? (
          ticks.map((tick) => (
            <span key={tick} className={styles.scaleTick}>
              {tick}
            </span>
          ))
        ) : (
          <span className={styles.scaleRangeFallback}>
            {safeMin} – {safeMax}
          </span>
        )}
      </div>
      <span className={styles.scaleLabel}>
        {maxLabel && maxLabel.length > 0 ? maxLabel : safeMax.toString()}
      </span>
    </div>
  );
};

export { ScalePreview };
