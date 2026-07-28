// The complete look of a placed item: a numbered disc in the item's color and
// an optional truncating label, inside the pill chrome and typography the
// badge itself owns. Pure view — it holds no state, takes no event handlers,
// and never positions itself. Callers wrap it in whatever interactive chrome
// they need (a draggable chip, a marker button on a placement surface) and
// keep drag, selection, positioning, and the styling of their own states
// there; nothing about how the badge looks is theirs to set.
//
// The shape follows the content: a bare disc when the number is all there is,
// a pill as soon as a label joins it. That is deliberately not a prop — the
// same content has to look the same in every context.
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
  /** Extra class for the wrapper's own hooks (e.g. pointer-events). */
  className?: string;
}

const MarkerBadge = ({ displayIndex, color, label, className }: MarkerBadgeProps) => {
  const trimmedLabel = label?.trim();
  const isPill = Boolean(trimmedLabel);

  return (
    <span
      className={[styles.badge, isPill ? styles.pill : "", className].filter(Boolean).join(" ")}
      style={{ "--marker-badge-color": color } as CSSProperties}
    >
      <span className={styles.disc} aria-hidden="true">
        {displayIndex}
      </span>
      {trimmedLabel && <span className={styles.label}>{trimmedLabel}</span>}
    </span>
  );
};

export { MarkerBadge };
export type { MarkerBadgeProps };
