// The shared look of a placed item: a numbered disc in the item's color, an
// optional thumbnail, and an optional truncating label. Pure view — it holds
// no state, takes no event handlers, and never positions itself. Callers wrap
// it in whatever interactive chrome they need (a draggable chip, a marker
// button on a placement surface) and keep the drag, selection, and positioning
// logic there.
//
// The disc's light ring keeps the number legible on top of an arbitrary
// backdrop (a photo, a colored cell), which is why every user gets it.
import type { CSSProperties } from "react";

import styles from "./MarkerBadge.module.css";

interface MarkerBadgeProps {
  /** 1-based position, drawn inside the disc. */
  displayIndex: number;
  /** Resolved item color, filling the disc. */
  color: string;
  /** Text beside the disc; blank or whitespace-only renders no label. */
  label?: string;
  /** Thumbnail between the disc and the label; absent renders no image. */
  imageSrc?: string | null;
  /** Extra class for the wrapper's own hooks (e.g. pointer-events). */
  className?: string;
}

const MarkerBadge = ({ displayIndex, color, label, imageSrc, className }: MarkerBadgeProps) => {
  const trimmedLabel = label?.trim();

  return (
    <span
      className={[styles.badge, className].filter(Boolean).join(" ")}
      style={{ "--marker-badge-color": color } as CSSProperties}
    >
      <span className={styles.disc} aria-hidden="true">
        {displayIndex}
      </span>
      {imageSrc && <img className={styles.image} src={imageSrc} alt="" />}
      {trimmedLabel && <span className={styles.label}>{trimmedLabel}</span>}
    </span>
  );
};

export { MarkerBadge };
export type { MarkerBadgeProps };
