/**
 * The Place-on-Image editor's placement surface: the backing image rendered at
 * its intrinsic aspect ratio (a plain block <img> sizes the wrapper, so the
 * normalized [0, 1] overlay coordinates always land where they will on the
 * player's screen — never letterboxed or stretched to a fixed frame), with the
 * placed target markers and their tolerance regions overlaid in percentages.
 *
 * Placement is direct: targets carry no labels, so there is no bank to arm —
 * a press on open image adds a target at the pointer and keeps dragging it
 * until release (Axis's plane-drag, minus the selection step), and placed
 * markers drag directly (pointer capture). Each marker is the numbered dot in
 * its palette color, matching its row in the Targets card.
 *
 * Coordinates are normalized [0, 1] in screen space over the image box —
 * (0, 0) is the image's top-left, y NOT inverted (unlike Axis), the natural
 * frame for an image and the space `RoundEvaluator.gradePlaceOnImage`
 * measures in. The tolerance region is drawn with its width and height as the
 * same percentage of the (usually non-square) image box, so it renders as the
 * exact ellipse the normalized-distance grader accepts — what the author sees
 * is what is graded. The pointer-free path lives in the target rows' popover
 * menus ("Center target", see `PlaceOnImageSlideContent`).
 *
 * A labeled target's marker grows an Axis-style label pill next to its
 * numbered dot — the DOT's centre, not the pill's, stays on the target point,
 * matching where the grader measures. Unlabeled markers stay a bare dot so
 * they don't crowd the image.
 */
import { useRef, useState } from "react";

import type { PlacePoint, PlaceTargetView } from "@deck/hooks/usePlaceOnImageEditor";
import { resolveTargetColor } from "./targetColor";
import styles from "./PlaceOnImageSlideContent.module.css";

/** Pointer travel (px) below which a marker press counts as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 4;

/** A drag in flight: an existing target (its index) or a brand-new one. */
interface DragState {
  index: number | "new";
  point: PlacePoint;
}

interface PlaceOnImageSurfaceProps {
  /** Resolved backing-image URL, or null while none is chosen. */
  imageUrl: string | null;
  targets: PlaceTargetView[];
  /** The shared normalized tolerance radius, drawn around every marker. */
  tolerance: number;
  /** Whether a press on open image may add a target (max not reached). */
  canAddTarget: boolean;
  onAddTarget: (point: PlacePoint) => void;
  onMoveTarget: (index: number, point: PlacePoint) => void;
}

const PlaceOnImageSurface = ({
  imageUrl,
  targets,
  tolerance,
  canAddTarget,
  onAddTarget,
  onMoveTarget,
}: PlaceOnImageSurfaceProps) => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  // Live position of the target being dragged — a marker drag or a press
  // placing a new target. Committed once, on release.
  const [drag, setDrag] = useState<DragState | null>(null);
  const pressRef = useRef<{ index: number; startX: number; startY: number; moved: boolean }>({
    index: -1,
    startX: 0,
    startY: 0,
    moved: false,
  });

  /** Normalized image-box point for a client position (top-left origin). */
  const pointFromClient = (clientX: number, clientY: number): PlacePoint | null => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = (clientX - rect.left) / rect.width;
    const y = (clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };

  // Press on open image: drop a new target at the pointer and keep following
  // it, committing once on release.
  const handleSurfacePointerDown = (event: React.PointerEvent) => {
    if (!imageUrl || !canAddTarget) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ index: "new", point });
  };

  const handleSurfacePointerMove = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDrag((prev) => (prev ? { index: prev.index, point } : prev));
  };

  const handleSurfacePointerUp = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point && drag) onAddTarget(point);
    setDrag(null);
  };

  const handleMarkerPointerDown = (index: number) => (event: React.PointerEvent) => {
    // Keep the press from also starting a new-target placement underneath.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = {
      index,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handleMarkerPointerMove = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (
      !press.moved &&
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) < DRAG_THRESHOLD_PX
    ) {
      return;
    }
    press.moved = true;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDrag({ index: press.index, point });
  };

  const handleMarkerPointerUp = (event: React.PointerEvent) => {
    const press = pressRef.current;
    // A sloppy click (under the threshold) must not nudge the target.
    if (press.moved) {
      const point = pointFromClient(event.clientX, event.clientY);
      if (point) onMoveTarget(press.index, point);
      setDrag(null);
    }
    pressRef.current.moved = false;
  };

  /** The marker's rendered position: the live drag point while dragging, else its stored target. */
  const renderedPoint = (index: number): PlacePoint =>
    drag?.index === index ? drag.point : targets[index];

  /** Marker + tolerance region at a normalized point, in the target's
   *  resolved color. A non-empty label grows the marker into a pill whose
   *  numbered dot stays centred on the point. */
  const renderTarget = (point: PlacePoint, index: number, key: string, isGhost: boolean) => {
    const label = isGhost ? "" : (targets[index].label?.trim() ?? "");
    const color = resolveTargetColor(isGhost ? undefined : targets[index].color, index);
    const position = {
      left: `${(point.x * 100).toString()}%`,
      top: `${(point.y * 100).toString()}%`,
    };
    const markerClass = [styles.marker, label ? styles.markerLabeled : ""]
      .filter(Boolean)
      .join(" ");
    const markerBody = (
      <>
        <span className={styles.markerDot} aria-hidden="true">
          {index + 1}
        </span>
        {label && <span className={styles.markerLabel}>{label}</span>}
      </>
    );
    return (
      <span
        key={key}
        className={styles.markerGroup}
        style={{ "--target-color": color } as React.CSSProperties}
      >
        <span
          className={styles.toleranceRegion}
          style={{
            ...position,
            width: `${(tolerance * 2 * 100).toString()}%`,
            height: `${(tolerance * 2 * 100).toString()}%`,
          }}
          aria-hidden="true"
        />
        {isGhost ? (
          // The new target being placed — not committed yet, so not a button.
          <span className={[markerClass, styles.markerGhost].join(" ")} style={position}>
            {markerBody}
          </span>
        ) : (
          <button
            type="button"
            className={markerClass}
            style={position}
            aria-label={`Target ${(index + 1).toString()}${label ? ` (${label})` : ""} — drag to move`}
            onPointerDown={handleMarkerPointerDown(index)}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
          >
            {markerBody}
          </button>
        )}
      </span>
    );
  };

  return (
    // Pointer placement surface; the pointer-free path is the target rows'
    // popover menus ("Center target").
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={surfaceRef}
      className={[
        styles.surface,
        imageUrl && canAddTarget ? styles.surfaceArmed : "",
        imageUrl ? "" : styles.surfaceEmpty,
      ]
        .filter(Boolean)
        .join(" ")}
      onPointerDown={handleSurfacePointerDown}
      onPointerMove={handleSurfacePointerMove}
      onPointerUp={handleSurfacePointerUp}
    >
      {imageUrl ? (
        // The img is the box: block-level, full width, intrinsic ratio height.
        <img className={styles.surfaceImage} src={imageUrl} alt="" draggable={false} />
      ) : (
        <span className={styles.surfacePlaceholder}>Choose an image to place targets on.</span>
      )}
      {imageUrl && targets.map((target, index) => renderTarget(renderedPoint(index), index, target.id, false))}
      {imageUrl && drag?.index === "new" && renderTarget(drag.point, targets.length, "ghost", true)}
    </div>
  );
};

export { PlaceOnImageSurface };
