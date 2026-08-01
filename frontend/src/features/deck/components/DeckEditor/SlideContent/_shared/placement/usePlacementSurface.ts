/**
 * A placement surface measured in normalized [0, 1] coordinates: the shared
 * pointer gestures of `usePointerPlacement`, resolved against the box of the
 * element `surfaceRef` is attached to.
 *
 * A hook rather than a component because the surrounding markup diverges (Axis
 * overlays endpoint pills on a square plane, Place-on-Image sizes itself from
 * the backing image) while only the pointer bookkeeping is common. The caller
 * supplies the surface's orientation and, per press, which key a fresh
 * placement belongs to (`pendingKey`) — Axis returns the armed row's item id,
 * Place-on-Image the `PENDING_PLACEMENT_KEY` sentinel because its new target
 * has no id until it is committed.
 *
 * A drag is tracked past the surface's edges — the live point clamps to the
 * border, and `drag.inside` says whether the pointer is actually over the box —
 * so a release outside is a real answer, decided per gesture exactly as Grid
 * decides a release over no cell: a fresh surface placement is abandoned
 * (nothing written, arming untouched), a dragged marker is unplaced
 * (`onMarkerCommit` with null).
 *
 * Grid does not compose this hook: its matrix is not a continuous space, so it
 * resolves a press to a cell instead (`useGridCellPlacement`, over the same
 * `usePointerPlacement`).
 */
import { useRef, type RefObject } from "react";

import { normalizeToBox } from "./placementGeometry";
import type { NormalizedPoint } from "./placement.types";
import { usePointerPlacement, type SurfacePointerHandlers } from "./usePointerPlacement";

/** Stands in for a not-yet-created entity while its first placement is dragged. */
const PENDING_PLACEMENT_KEY = "__pending__";

/** What a pointer position resolves to: the clamped point, and whether the
 * pointer is actually over the surface's box. */
interface SurfacePlacement {
  point: NormalizedPoint;
  inside: boolean;
}

/** The placement in flight — the key being moved, its live (clamped) point, and
 * whether releasing here lands it (`inside`) or discards it. */
interface PlacementDrag {
  key: string;
  point: NormalizedPoint;
  inside: boolean;
}

interface UsePlacementSurfaceOptions {
  /** True when the surface's (0, 0) is its bottom-left (Axis's grading space). */
  invertY: boolean;
  /** Key a fresh surface placement belongs to, or null when the surface is inert. */
  pendingKey: () => string | null;
  /** A press on open surface released over it; a release outside never lands here. */
  onSurfaceCommit: (key: string, point: NormalizedPoint) => void;
  /** A dragged marker released: a point moves it, null (released outside) unplaces it. */
  onMarkerCommit: (key: string, point: NormalizedPoint | null) => void;
  /** A marker pressed without dragging; omit for surfaces with no tap meaning. */
  onMarkerTap?: (key: string) => void;
}

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

/** Half-open on the far edges, mirroring Grid's cell hit-test. */
const insideBox = (rect: DOMRect, clientX: number, clientY: number): boolean =>
  clientX >= rect.left && clientX < rect.right && clientY >= rect.top && clientY < rect.bottom;

const usePlacementSurface = ({
  invertY,
  pendingKey,
  onSurfaceCommit,
  onMarkerCommit,
  onMarkerTap,
}: UsePlacementSurfaceOptions): UsePlacementSurfaceResult => {
  const surfaceRef = useRef<HTMLDivElement>(null);

  const placement = usePointerPlacement<SurfacePlacement>({
    resolve: (clientX, clientY) => {
      const rect = surfaceRef.current?.getBoundingClientRect();
      const point = normalizeToBox(rect, clientX, clientY, invertY);
      if (rect == null || point == null) return null;
      return { point, inside: insideBox(rect, clientX, clientY) };
    },
    pendingKey,
    onSurfaceCommit: (key, { point, inside }) => {
      // Released outside: the placement is abandoned, not written.
      if (inside) onSurfaceCommit(key, point);
    },
    onMarkerCommit: (key, { point, inside }) => {
      onMarkerCommit(key, inside ? point : null);
    },
    onMarkerTap,
  });

  return {
    surfaceRef,
    surfaceProps: placement.surfaceProps,
    markerProps: placement.markerProps,
    // Named `point` rather than the generic `value` — this surface's callers
    // read a coordinate, not "whatever is being placed".
    drag: placement.drag && {
      key: placement.drag.key,
      point: placement.drag.value.point,
      inside: placement.drag.value.inside,
    },
    pointFor: (key, stored) =>
      placement.drag?.key === key ? placement.drag.value.point : stored,
  };
};

export { PENDING_PLACEMENT_KEY, usePlacementSurface };
export type { PlacementDrag, UsePlacementSurfaceOptions, UsePlacementSurfaceResult };
