import { useRef, type RefObject } from "react";

import { Point } from "react-easy-crop";
import { normalizeToBox } from "./placementGeometry";
import { usePointerPlacement, type SurfacePointerHandlers } from "./usePointerPlacement";

/** Stands in for a not-yet-created entity while its first placement is dragged. */
const PENDING_PLACEMENT_KEY = "__pending__";

/** What a pointer position resolves to: the clamped point, and whether the
 * pointer is actually over the surface's box. */
interface SurfacePlacement {
  point: Point;
  inside: boolean;
}

/** The placement in flight — the key being moved, its live (clamped) point, and
 * whether releasing here lands it (`inside`) or discards it. */
interface PlacementDrag {
  key: string;
  point: Point;
  inside: boolean;
}

interface UsePlacementSurfaceOptions {
  /** True when the surface's (0, 0) is its bottom-left (Axis's grading space). */
  invertY: boolean;
  /** Key a fresh surface placement belongs to, or null when the surface is inert. */
  pendingKey: () => string | null;
  /** A press on open surface released over it; a release outside never lands here. */
  onSurfaceCommit: (key: string, point: Point) => void;
  /** A dragged marker released: a point moves it, null (released outside) unplaces it. */
  onMarkerCommit: (key: string, point: Point | null) => void;
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
  pointFor: (key: string, stored: Point | undefined) => Point | undefined;
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
    pointFor: (key, stored) => (placement.drag?.key === key ? placement.drag.value.point : stored),
  };
};

export { PENDING_PLACEMENT_KEY, usePlacementSurface };
export type { PlacementDrag, UsePlacementSurfaceOptions, UsePlacementSurfaceResult };
