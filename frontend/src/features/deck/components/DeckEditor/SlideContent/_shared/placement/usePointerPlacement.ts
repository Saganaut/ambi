/**
 * The pointer gestures every placement editor shares — press-to-place,
 * drag-to-move, tap-to-select — over whatever a press resolves to.
 *
 * Split out of `usePlacementSurface` because the surfaces no longer agree on
 * what a press means: Axis and Place-on-Image resolve one to a normalized point
 * in a continuous space, Grid to a cell of its matrix (or to no cell at all).
 * Everything around that is identical — the pointer capture that keeps a drag
 * alive once it leaves the element, the value held in local state so a drag
 * never floods the editor with writes, the single commit on release, and the
 * sub-threshold press that is a tap rather than a nudge — so it lives here and
 * the caller supplies only `resolve`.
 *
 * `resolve` returning null means "a press here places nothing": the gesture is
 * simply not started. A surface that must keep tracking the pointer even where
 * it cannot place (Grid, whose ghost follows into the gaps) resolves to a value
 * that says so instead, and decides in its commit callbacks.
 */
import { useRef, useState, type DOMAttributes, type PointerEventHandler } from "react";

import { DRAG_THRESHOLD_PX } from "./placementGeometry";

/** The placement in flight — the key being placed and its live value. */
interface PointerPlacement<TValue> {
  key: string;
  value: TValue;
}

interface UsePointerPlacementOptions<TValue> {
  /** Pointer position → what a press there places; null when it places nothing. */
  resolve: (clientX: number, clientY: number) => TValue | null;
  /** Key a fresh surface placement belongs to, or null when the surface is inert. */
  pendingKey: () => string | null;
  /** A press on open surface, committed on release. */
  onSurfaceCommit: (key: string, value: TValue) => void;
  /** A placed marker dragged past the tap threshold, committed on release. */
  onMarkerCommit: (key: string, value: TValue) => void;
  /** A marker pressed without dragging; omit for surfaces with no tap meaning. */
  onMarkerTap?: (key: string) => void;
}

type SurfacePointerHandlers = Pick<
  DOMAttributes<HTMLElement>,
  "onPointerDown" | "onPointerMove" | "onPointerUp"
>;

interface UsePointerPlacementResult<TValue> {
  /** Spread on the element a fresh placement is pressed onto. */
  surfaceProps: SurfacePointerHandlers;
  /** Spread on an already-placed marker so it drags (or taps) directly. */
  markerProps: (key: string) => SurfacePointerHandlers;
  /** The placement in flight, or null when the pointer is idle. */
  drag: PointerPlacement<TValue> | null;
  /** The value to render for a key: the live drag value, else what's stored. */
  valueFor: (key: string, stored: TValue | undefined) => TValue | undefined;
}

const usePointerPlacement = <TValue>({
  resolve,
  pendingKey,
  onSurfaceCommit,
  onMarkerCommit,
  onMarkerTap,
}: UsePointerPlacementOptions<TValue>): UsePointerPlacementResult<TValue> => {
  const [drag, setDrag] = useState<PointerPlacement<TValue> | null>(null);
  const pressRef = useRef<{ key: string; startX: number; startY: number; moved: boolean }>({
    key: "",
    startX: 0,
    startY: 0,
    moved: false,
  });

  // Press on open surface: place at the pointer and keep following it,
  // committing once on release.
  const handleSurfacePointerDown: PointerEventHandler<HTMLElement> = (event) => {
    const key = pendingKey();
    if (key == null) return;
    const value = resolve(event.clientX, event.clientY);
    if (value == null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ key, value });
  };

  const handleSurfacePointerMove: PointerEventHandler<HTMLElement> = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = resolve(event.clientX, event.clientY);
    if (value != null) setDrag((prev) => (prev ? { key: prev.key, value } : prev));
  };

  const handleSurfacePointerUp: PointerEventHandler<HTMLElement> = (event) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = resolve(event.clientX, event.clientY);
    if (value != null && drag) onSurfaceCommit(drag.key, value);
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
    const value = resolve(event.clientX, event.clientY);
    if (value != null) setDrag({ key: press.key, value });
  };

  const handleMarkerPointerUp: PointerEventHandler<HTMLElement> = (event) => {
    const press = pressRef.current;
    // A sloppy click (under the threshold) must not nudge the placement.
    if (press.moved) {
      const value = resolve(event.clientX, event.clientY);
      if (value != null) onMarkerCommit(press.key, value);
      setDrag(null);
    } else {
      onMarkerTap?.(press.key);
    }
    pressRef.current.moved = false;
  };

  return {
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
    valueFor: (key, stored) => (drag?.key === key ? drag.value : stored),
  };
};

export { usePointerPlacement };
export type {
  PointerPlacement,
  SurfacePointerHandlers,
  UsePointerPlacementOptions,
  UsePointerPlacementResult,
};
