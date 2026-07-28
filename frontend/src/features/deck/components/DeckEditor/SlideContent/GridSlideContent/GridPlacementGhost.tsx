/**
 * The item a Grid placement gesture is carrying, drawn under the pointer until
 * the gesture commits: the same `MarkerBadge` the item's chip and row show, but
 * translucent and inert.
 *
 * Positioned `fixed` in viewport coordinates because the gesture outlives the
 * matrix — a chip dragged past its edge to unplace it must stay visible, and no
 * ancestor's overflow may clip it. Decorative throughout: it mirrors state the
 * chips and cells already announce, so it is hidden from assistive tech.
 */
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import styles from "./GridSlideContent.module.css";

interface GridPlacementGhostProps {
  /** 1-based position, matching the item's row and chip. */
  displayIndex: number;
  /** Resolved item color, shared with the row's index pill. */
  color: string;
  label?: string;
  imageSrc?: string | null;
  /** Viewport coordinates of the pointer carrying it. */
  clientX: number;
  clientY: number;
}

const GridPlacementGhost = ({
  displayIndex,
  color,
  label,
  imageSrc,
  clientX,
  clientY,
}: GridPlacementGhostProps) => (
  <span
    className={styles.ghost}
    style={{ left: `${clientX.toString()}px`, top: `${clientY.toString()}px` }}
    aria-hidden="true"
  >
    <MarkerBadge displayIndex={displayIndex} color={color} label={label} imageSrc={imageSrc} />
  </span>
);

export { GridPlacementGhost };
