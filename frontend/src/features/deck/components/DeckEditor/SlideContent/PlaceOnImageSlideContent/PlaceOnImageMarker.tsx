/**
 * A Place-on-Image target marker and its circular tolerance region.
 *
 * The marker's numbered dot remains centred on the normalized target point
 * when an optional label grows it into a pill.
 */
import type { CSSProperties, PointerEventHandler } from "react";

import type { PlacePoint, PlaceTargetView } from "@deck/hooks/usePlaceOnImageEditor";
import styles from "./PlaceOnImageSlideContent.module.css";
import { resolveTargetColor } from "./targetColor";

interface PlaceOnImageMarkerProps {
  point: PlacePoint;
  target?: PlaceTargetView;
  index: number;
  tolerance: number;
  isGhost?: boolean;
  onPointerDown?: PointerEventHandler<HTMLButtonElement>;
  onPointerMove?: PointerEventHandler<HTMLButtonElement>;
  onPointerUp?: PointerEventHandler<HTMLButtonElement>;
}

const PlaceOnImageMarker = ({
  point,
  target,
  index,
  tolerance,
  isGhost = false,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: PlaceOnImageMarkerProps) => {
  const label = isGhost ? "" : (target?.label?.trim() ?? "");
  const color = resolveTargetColor(isGhost ? undefined : target?.color, index);
  const position = {
    left: `${(point.x * 100).toString()}%`,
    top: `${(point.y * 100).toString()}%`,
  };
  const markerClass = [styles.marker, label ? styles.markerLabeled : ""].filter(Boolean).join(" ");
  const markerBody = (
    <>
      <span className={styles.markerDot} aria-hidden="true">
        {index + 1}
      </span>
      {label && <span className={styles.markerLabel}>{label}</span>}
    </>
  );

  return (
    <span className={styles.markerGroup} style={{ "--target-color": color } as CSSProperties}>
      <span
        className={styles.toleranceRegion}
        style={{
          ...position,
          width: `${(tolerance * 2 * 100).toString()}%`,
          aspectRatio: "1",
        }}
        aria-hidden="true"
      />
      {isGhost ? (
        <span className={[markerClass, styles.markerGhost].join(" ")} style={position}>
          {markerBody}
        </span>
      ) : (
        <button
          type="button"
          className={markerClass}
          style={position}
          aria-label={`Target ${(index + 1).toString()}${label ? ` (${label})` : ""} — drag to move`}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
        >
          {markerBody}
        </button>
      )}
    </span>
  );
};

export { PlaceOnImageMarker };
