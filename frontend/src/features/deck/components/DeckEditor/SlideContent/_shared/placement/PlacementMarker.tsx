/**
 * One placed point on a placement surface: a `MarkerBadge` carrying the item's
 * number and color, plus the tolerance region the grader accepts.
 *
 * The badge owns how it looks — the disc, and the pill it becomes once the item
 * carries a real label. This wrapper owns only where it sits and how it reacts:
 * the number always shows so the marker reads against its row's index pill, and
 * the labeled variant is offset so the badge's disc — not the pill — lands on
 * the placement point. Positioning goes through `toRenderStyle`, so the caller
 * hands over the point in the surface's own grading space and states the
 * surface's orientation once via `invertY`.
 */
import type { CSSProperties, PointerEventHandler } from "react";

import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import { toRenderStyle } from "./placementGeometry";
import type { NormalizedPoint } from "./placement.types";
import styles from "./placement.module.css";

interface PlacementMarkerProps {
  /** The placement point in the surface's normalized space. */
  point: NormalizedPoint;
  /** True when the surface's (0, 0) is its bottom-left (Axis's plane). */
  invertY?: boolean;
  /** Resolved item color — override or palette default. */
  color: string;
  /** 1-based position, drawn inside the dot. */
  displayIndex: number;
  /** Grows the dot into a pill; blank/absent keeps the marker a bare dot. */
  label?: string;
  /** Normalized tolerance radius; omitted draws no accepted region. */
  tolerance?: number;
  ariaLabel: string;
  selected?: boolean;
  /** A placement still following the pointer — inert and translucent. */
  ghost?: boolean;
  onPointerDown?: PointerEventHandler<HTMLElement>;
  onPointerMove?: PointerEventHandler<HTMLElement>;
  onPointerUp?: PointerEventHandler<HTMLElement>;
}

const PlacementMarker = ({
  point,
  invertY = false,
  color,
  displayIndex,
  label,
  tolerance,
  ariaLabel,
  selected,
  ghost = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PlacementMarkerProps) => {
  const position = toRenderStyle(point, invertY);
  const trimmedLabel = label?.trim() ?? "";
  const markerClass = [styles.marker, trimmedLabel ? styles.markerLabeled : ""]
    .filter(Boolean)
    .join(" ");
  const markerBody = <MarkerBadge displayIndex={displayIndex} color={color} label={trimmedLabel} />;

  return (
    <span className={styles.markerGroup} style={{ "--placement-color": color } as CSSProperties}>
      {tolerance != null && (
        <span
          className={styles.toleranceCircle}
          style={{
            ...position,
            // Diameter off the surface's width plus a square ratio: circular
            // whatever the surface's own aspect ratio is.
            width: `${(tolerance * 2 * 100).toString()}%`,
            aspectRatio: "1",
          }}
          aria-hidden="true"
        />
      )}
      {ghost ? (
        <span className={[markerClass, styles.markerGhost].join(" ")} style={position}>
          {markerBody}
        </span>
      ) : (
        <button
          type="button"
          className={markerClass}
          style={position}
          aria-label={ariaLabel}
          aria-pressed={selected}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onClick={(event) => {
            // Selection is settled on pointerup; keep the click from falling
            // through to the surface underneath.
            event.stopPropagation();
          }}
        >
          {markerBody}
        </button>
      )}
    </span>
  );
};

export { PlacementMarker };
export type { PlacementMarkerProps };
