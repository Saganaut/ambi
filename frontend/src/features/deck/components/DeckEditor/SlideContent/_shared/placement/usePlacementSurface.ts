/**
 * The pointer machinery every placement surface shares: press-to-place,
 * drag-to-move, and tap-to-select, in normalized coordinates.
 *
 * A hook rather than a component because the surrounding markup diverges (Axis
 * overlays endpoint pills on a square plane, Place-on-Image sizes itself from
 * the backing image) while only the pointer bookkeeping is common. The caller
 * supplies the surface's orientation and, per press, which key a fresh
 * placement belongs to (`pendingKey`) — Axis returns the armed row's item id,
 * Place-on-Image the `PENDING_PLACEMENT_KEY` sentinel because its new target
 * has no id until it is committed.
 *
 * Both gestures use pointer capture so a drag that leaves the surface keeps
 * tracking, and both commit exactly once, on release: the live point lives in
 * local state until then, so a drag never floods the editor with writes. A
 * marker press under `DRAG_THRESHOLD_PX` of travel is a tap, not a nudge —
 * that's what routes it to `onMarkerTap` instead of `onMarkerCommit`.
 */
import {
  useRef,
  useState,
  type DOMAttributes,
  type PointerEventHandler,
  type RefObject,
} from "react";

import { DRAG_THRESHOLD_PX, normalizeToBox } from "./placementGeometry";
import type { NormalizedPoint } from "./placement.types";

/** Stands in for a not-yet-created entity while its first placement is dragged. */
const PENDING_PLACEMENT_KEY = "__pending__";

/** The placement in flight — the key being moved and its live point. */
interface PlacementDrag {
  key: string;
  point: NormalizedPoint;
}

interface UsePlacementSurfaceOptions {
  /** True when the surface's (0, 0) is its bottom-left (Axis's grading space). */
  invertY: boolean;
  /** Key a fresh surface placement belongs to, or null when the surface is inert. */
  pendingKey: () => string | null;
  /** A press on open surface, committed on release. */
  onSurfaceCommit: (key: string, point: NormalizedPoint) => void;
  /** A placed marker dragged past the tap threshold, committed on release. */
  onMarkerCommit: (key: string, point: NormalizedPoint) => void;
  /** A marker pressed without dragging; omit for surfaces with no tap meaning. */
  onMarkerTap?: (key: string) => void;
}

type SurfacePointerHandlers = Pick<
  DOMAttributes<HTMLElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp"
>;

interface UsePlacementSurfaceResult {
  /** Attach to the element whose box defines the normalized space. */
  surfaceRef: RefObject<HTMLDivElement | null>;
  surfaceProps: SurfacePointerHandlers;
  markerProps: (key: string) => SurfacePointerHandlers;
  /** The placement in flight, or null when the pointer is idle. */
  drag: PlacementDrag | null;
  /** The point to render for a key: the live drag point, else what's stored. */
  pointFor: (key: string, stored: NormalizedPoint | undefined) => NormalizedPoint | undefined;
}

const usePlacementSurface = ({
  invertY,
  pendingKey,
  onSurfaceCommit,
  onMarkerCommit,
  onMarkerTap,
}: UsePlacementSurfaceOptions): UsePlacementSurfaceResult => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<PlacementDrag | null>(null);
  const pressRef = useRef<{ key: string; startX: number; startY: number; moved: boolean }>({
    key: "",
    startX: 0,
    startY: 0,
    moved: false,
  });

  const pointFromClient = (clientX: number, clientY: number): NormalizedPoint | null =>
    normalizeToBox(surfaceRef.current?.getBoundingClientRect(), clientX, clientY, invertY);

  // Press on open surface: place at the pointer and keep following it,
  // committing once on release.
  const handleSurfacePointerDown: PointerEventHandler<HTMLElement> = (event) => {
    const key = pendingKey();
    if (key == null) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ key, point });
  };

  const handleSurfacePointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDrag((prev) => (prev ? { key: prev.key, point } : prev));
  };

  const handleSurfacePointerUp: PointerEventHandler<HTMLElement> = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point && drag) onSurfaceCommit(drag.key, point);
    setDrag(null);
  };

  const handleMarkerPointerDown =
    (key: string): PointerEventHandler<HTMLElement> =>
    (event) => {
      // Keep the press from also starting a placement on the surface underneath.
      event.stopPropagation();
      event.currentTarget.setPointerCapture(event.pointerId);
      pressRef.current = { key, startX: event.clientX, startY: event.clientY, moved: false };
    };

  const handleMarkerPointerMove: PointerEventHandler<HTMLElement> = (event) => {
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
    if (point) setDrag({ key: press.key, point });
  };

  const handleMarkerPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    const press = pressRef.current;
    // A sloppy click (under the threshold) must not nudge the placement.
    if (press.moved) {
      const point = pointFromClient(event.clientX, event.clientY);
      if (point) onMarkerCommit(press.key, point);
      setDrag(null);
    } else {
      onMarkerTap?.(press.key);
    }
    pressRef.current.moved = false;
  };

  return {
    surfaceRef,
    surfaceProps: {
      onPointerDown: handleSurfacePointerDown,
      onPointerMove: handleSurfacePointerMove,
      onPointerUp: handleSurfacePointerUp,
    },
    markerProps: (key) => ({
      onPointerDown: handleMarkerPointerDown(key),
      onPointerMove: handleMarkerPointerMove,
      onPointerUp: handleMarkerPointerUp,
    }),
    drag,
    pointFor: (key, stored) => (drag?.key === key ? drag.point : stored),
  };
};

export { PENDING_PLACEMENT_KEY, usePlacementSurface };
export type { PlacementDrag, UsePlacementSurfaceOptions, UsePlacementSurfaceResult };
