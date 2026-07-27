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
 * measures in. The tolerance region uses the image width for its diameter and
 * a fixed 1:1 aspect ratio so it remains circular on non-square images. The
 * pointer-free path lives in the target rows' popover menus ("Center target",
 * see `PlaceOnImageSlideContent`).
 *
 * A labeled target's marker grows an Axis-style label pill next to its
 * numbered dot — the DOT's centre, not the pill's, stays on the target point,
 * matching where the grader measures. Unlabeled markers stay a bare dot so
 * they don't crowd the image.
 */
import { useRef, useState } from "react";

import type { PlacePoint, PlaceTargetView } from "@deck/hooks/usePlaceOnImageEditor";
import styles from "./PlaceOnImageSlideContent.module.css";
import { PlaceOnImageMarker } from "./PlaceOnImageMarker";

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
      {imageUrl &&
        targets.map((target, index) => (
          <PlaceOnImageMarker
            key={target.id}
            point={renderedPoint(index)}
            target={target}
            index={index}
            tolerance={tolerance}
            onPointerDown={handleMarkerPointerDown(index)}
            onPointerMove={handleMarkerPointerMove}
            onPointerUp={handleMarkerPointerUp}
          />
        ))}
      {imageUrl && drag?.index === "new" && (
        <PlaceOnImageMarker
          point={drag.point}
          index={targets.length}
          tolerance={tolerance}
          isGhost
        />
      )}
    </div>
  );
};

export { PlaceOnImageSurface };
