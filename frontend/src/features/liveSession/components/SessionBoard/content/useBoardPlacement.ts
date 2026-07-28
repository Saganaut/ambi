// The placement interaction engine behind the two continuous-surface boards —
// the Axis plane and the Place-on-Image image. Both grade a POINT rather than a
// region, and both accept the same two layered inputs: pointer/touch DRAG is the
// primary path (drag a bank chip onto the surface to drop it at the pointer,
// drag a placed chip to move it or back to the bank to un-place it), and
// tap-to-place is the small-screen / keyboard / AT fallback (tap a bank chip to
// hold it, tap the surface to drop it, arrow keys nudge a focused placed chip).
// Everything stateful about that — the round-local draft map, the held chip, the
// submitted flag, and the ref for the box those coordinates are measured against
// — lives here; the boards keep every rendering decision (chips, badges, heat /
// scatter overlays, banks, banners).
//
// Two options reconcile the two boards:
//   - `invertY` is the surface's orientation, handed straight to the shared
//     geometry: the Axis plane measures from its low/low corner (bottom-left as
//     rendered, so screen y inverts) while Place-on-Image measures from the
//     image's top-left like the browser does. It is also the only thing the
//     arrow-key deltas differ by.
//   - `lockOnSubmit` is the answer's cardinality: a Place-on-Image map locks on
//     the first submit, while an Axis map may be re-sent until the round locks
//     (the backend forces maxSelections=0, last write wins), so submitting never
//     freezes the Axis plane — only the round moving to results does.
//
// Grid drags chips from a bank too, but its droppables are discrete cells — each
// cell IS the answer, no coordinate involved — so it keeps its own model.
//
// This is a round-local interaction primitive, not one of the CQRS data hooks in
// z-docs/rules/frontend/hook-roles.md (it owns no server state and reads no
// cache); it sits beside `useCappedSelection`, the same shape of answer-surface
// state shared across boards.
import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent, MouseEvent, RefObject } from "react";
import type { DragEndEvent } from "@dnd-kit/react";

import {
  useSessionConnection,
  type SessionAnswerPayload,
} from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "@utils/dragDrop";
import { clampPoint, normalizeToBox, type NormalizedPoint } from "@utils/placementGeometry";
import { SURFACE_DROPPABLE_ID } from "./PlacementSurface/PlacementSurface";

/** Arrow-key nudge step for a focused placed chip, in normalized units. */
const KEYBOARD_NUDGE_STEP = 0.02;

/**
 * The only thing the engine needs of an authored item: its id, optional because
 * every generated item view types it that way. An id-less item never enters the
 * placement map — it would key it under `""`.
 */
interface PlaceableItem {
  id?: string;
}

/** Round-local draft placements: item id → normalized point on the surface. */
type PlacementMap = Record<string, NormalizedPoint>;

interface BoardPlacementOptions {
  /** The round key: the whole draft resets whenever it changes. */
  slideId: string;
  /** The authored items, one placement each — the `allPlaced` denominator. */
  items: readonly PlaceableItem[];
  /** The board's answerable moments — typically `interactive && mode !== "results"`. */
  answerable: boolean;
  /** True for a one-shot answer that freezes the surface once submitted. */
  lockOnSubmit: boolean;
  /** Surface orientation: true when (0, 0) is the bottom-left, not the top-left. */
  invertY: boolean;
  /** Wraps the draft in this board's answer payload at submit time. */
  buildAnswer: (placements: PlacementMap) => SessionAnswerPayload;
}

interface BoardPlacement {
  /** The draft placements, for rendering the viewer's own chips. */
  placements: PlacementMap;
  /** The chip waiting for a tap on the surface, if any. */
  heldItemId: string | null;
  /** Whether this round's map has been sent at least once. */
  submitted: boolean;
  /** Whether placement input is accepted right now (`lockOnSubmit` applied). */
  canPlace: boolean;
  /** Whether every authored item has a placement — the submit gate. */
  allPlaced: boolean;
  /** Attach to {@link PlacementSurface}: the box drops and taps normalize against. */
  surfaceRef: RefObject<HTMLDivElement | null>;
  /** dnd-kit drop: place / move at the drop pointer, or un-place onto the bank. */
  handleDragEnd: (event: DragEndEvent) => void;
  /** Tap fallback: drops the held chip at the tap point. */
  placeAt: (event: MouseEvent<HTMLElement>) => void;
  /** Arrow-key handler for a focused placed chip, clamped to the surface. */
  nudge: (itemId: string) => (event: KeyboardEvent) => void;
  /** Bank chip tap: hold this item, or release it if it was already held. */
  toggleHold: (itemId: string | undefined) => void;
  /** Placed chip tap: pick it back up — un-placed and held for a re-place. */
  liftItem: (itemId: string) => void;
  /** Send the whole map (no-op unless placeable and complete) and mark it sent. */
  submit: () => void;
}

/**
 * Placement state and input handlers for a continuous-surface board. See the
 * file header for the drag / tap / keyboard model and what `invertY` and
 * `lockOnSubmit` reconcile.
 */
const useBoardPlacement = ({
  slideId,
  items,
  answerable,
  lockOnSubmit,
  invertY,
  buildAnswer,
}: BoardPlacementOptions): BoardPlacement => {
  const { sendAnswer } = useSessionConnection();

  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const [placements, setPlacements] = useState<PlacementMap>({});
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setPlacements({});
    setHeldItemId(null);
    setSubmitted(false);
  }, [slideId]);

  const canPlace = answerable && !(lockOnSubmit && submitted);
  const allPlaced = items.length > 0 && items.every((item) => item.id && placements[item.id]);

  // The point for a client coordinate over the surface's own box, or null when
  // the surface is unmounted / zero-sized (nothing can be placed on it).
  const pointFor = (clientX: number, clientY: number): NormalizedPoint | null =>
    normalizeToBox(surfaceRef.current?.getBoundingClientRect(), clientX, clientY, invertY);

  const unplace = (itemId: string) => {
    setPlacements((prev) => {
      const { [itemId]: _lifted, ...rest } = prev;
      return rest;
    });
  };

  // Resolve a drag onto the surface (place / move at the drop pointer) or onto
  // the bank (un-place), no-op'ing a drop with no coordinate. The drop
  // coordinate comes from dnd-kit's live pointer position, not the droppable id.
  const handleDragEnd = (event: DragEndEvent) => {
    const drop = resolveDragEnd(event);
    if (!drop || !canPlace) return;
    const { itemId, targetId } = drop;
    // An id-less item renders with an empty draggable id; never let that key
    // into the placement map — the tap flow guards the same way.
    if (!itemId) return;
    if (targetId === BANK_DROPPABLE_ID) {
      if (!placements[itemId]) return;
      unplace(itemId);
    } else if (targetId === SURFACE_DROPPABLE_ID) {
      const pointer = event.operation.position.current;
      const point = pointFor(pointer.x, pointer.y);
      if (!point) return;
      setPlacements((prev) => ({ ...prev, [itemId]: point }));
    }
    if (heldItemId === itemId) setHeldItemId(null);
  };

  const placeAt = (event: MouseEvent<HTMLElement>) => {
    if (!canPlace || heldItemId == null) return;
    const point = pointFor(event.clientX, event.clientY);
    if (!point) return;
    setPlacements((prev) => ({ ...prev, [heldItemId]: point }));
    setHeldItemId(null);
  };

  const nudge = (itemId: string) => (event: KeyboardEvent) => {
    if (!canPlace) return;
    // Vertical deltas follow the surface's origin: with a bottom-left origin
    // ArrowUp increases y, with a top-left origin it decreases it.
    const upwards = invertY ? KEYBOARD_NUDGE_STEP : -KEYBOARD_NUDGE_STEP;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-KEYBOARD_NUDGE_STEP, 0],
      ArrowRight: [KEYBOARD_NUDGE_STEP, 0],
      ArrowUp: [0, upwards],
      ArrowDown: [0, -upwards],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setPlacements((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: clampPoint({ x: current.x + delta[0], y: current.y + delta[1] }),
      };
    });
  };

  const toggleHold = (itemId: string | undefined) => {
    setHeldItemId((prev) => (prev === itemId ? null : (itemId ?? null)));
  };

  const liftItem = (itemId: string) => {
    if (!canPlace) return;
    unplace(itemId);
    setHeldItemId(itemId);
  };

  const submit = () => {
    if (!canPlace || !allPlaced) return;
    sendAnswer(slideId, buildAnswer(placements));
    setSubmitted(true);
  };

  return {
    placements,
    heldItemId,
    submitted,
    canPlace,
    allPlaced,
    surfaceRef,
    handleDragEnd,
    placeAt,
    nudge,
    toggleHold,
    liftItem,
    submit,
  };
};

export { KEYBOARD_NUDGE_STEP, useBoardPlacement };
export type { BoardPlacement, BoardPlacementOptions, PlacementMap };
