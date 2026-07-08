// Live "what the player sees" preview for the Scale settings card: the
// continuous track that joins the two endpoint cards, plus a compact
// "min → max" caption. Purely presentational — the track is decorative (the
// caption carries the numbers), so it is hidden from assistive tech.
import styles from "./ScalesSlideContent.module.css";

interface ScalePreviewProps {
  min: number;
  max: number;
}

const ScalePreview = ({ min, max }: ScalePreviewProps) => (
  <div className={styles.trackPreview}>
    <div className={styles.trackDots} aria-hidden='true'>
      <div className={styles.trackLine} />
      <span className={[styles.trackDot, styles.trackDotStart].join(" ")} />
      <span className={[styles.trackDot, styles.trackDotEnd].join(" ")} />
    </div>
    <span className={styles.trackCaption}>
      {min} → {max}
    </span>
  </div>
);

export { ScalePreview };
