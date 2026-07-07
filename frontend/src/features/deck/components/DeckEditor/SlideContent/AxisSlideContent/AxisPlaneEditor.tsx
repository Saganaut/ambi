/**
 * The Axis editor's plane: a near-square X × Y surface with the four
 * endpoint-label inputs overlaid as pills inside its edges (top/bottom for
 * the Y axis, left/right for the X axis — empty labels fall back to
 * placeholders, grid's "Row 1" pattern) so the plane claims all the room.
 *
 * Placement is select-then-drag: the composer holds the selected item (rows
 * and markers both select), and while an item is selected any press on the
 * plane drops — and keeps dragging — its target at the pointer's normalized
 * coordinates. Placed markers can also be dragged directly (pointer capture),
 * or tapped to toggle their row's selection. Every placed marker is drawn in
 * its item's palette color with its dashed tolerance circle, in the same
 * normalized space the grader measures in, so what the author sees is what
 * is graded. The marker's dot — not the label pill — sits on the target.
 *
 * Coordinates are normalized [0, 1] with (0,0) the low/low corner — bottom-left
 * as rendered — so the screen y-axis is inverted on the way in and out.
 * The accessible, pointer-free path lives in the item rows' numeric X/Y inputs
 * (see `AxisItemEditable`).
 */
import { useRef, useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import {
  AXIS_LABEL_MAX,
  type AxisAxis,
  type AxisEnd,
  type AxisQuestionView,
} from "@deck/hooks/useAxisEditor";
import type { AxisPoint } from "@deck/store/deckApi.gen";
import { resolveAxisItemColor } from "./axisItemColor";
import styles from "./AxisSlideContent.module.css";

/** Pointer travel (px) below which a marker press counts as a tap, not a drag. */
const DRAG_THRESHOLD_PX = 4;

/** Display name for an item label, falling back to its 1-based position. */
const labelOr = (label: string | undefined, index: number): string =>
  (label?.trim() ?? "") ? (label as string).trim() : `Item ${(index + 1).toString()}`;

interface AxisPlaneEditorProps {
  question: AxisQuestionView;
  /** The item armed for placement (row or marker selection), if any. */
  selectedItemId: string | null;
  /** Toggle an item's selection (marker tap picks it up / puts it down). */
  onToggleSelect: (itemId: string) => void;
  onScheduleAxisLabel: (axis: AxisAxis, end: AxisEnd, text: string) => void;
  onSetTargetPosition: (itemId: string, point: AxisPoint | null) => void;
  onFlush: () => void;
}

const AxisPlaneEditor = ({
  question,
  selectedItemId,
  onToggleSelect,
  onScheduleAxisLabel,
  onSetTargetPosition,
  onFlush,
}: AxisPlaneEditorProps) => {
  const planeRef = useRef<HTMLDivElement>(null);

  // Live drag position of a target while the pointer is captured — either a
  // marker drag or a plane press placing the selected item.
  const [drag, setDrag] = useState<{ itemId: string; point: AxisPoint } | null>(null);
  const pressRef = useRef<{ itemId: string; startX: number; startY: number; moved: boolean }>({
    itemId: "",
    startX: 0,
    startY: 0,
    moved: false,
  });

  // Local mirrors for the debounced endpoint-label inputs, resynced on slide
  // change ("derive state during render").
  const [labels, setLabels] = useState({
    xLow: question.xLowLabel,
    xHigh: question.xHighLabel,
    yLow: question.yLowLabel,
    yHigh: question.yHighLabel,
  });
  const [syncedFromId, setSyncedFromId] = useState(question.id);
  if (syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setLabels({
      xLow: question.xLowLabel,
      xHigh: question.xHighLabel,
      yLow: question.yLowLabel,
      yHigh: question.yHighLabel,
    });
  }

  /** Normalized plane point for a client position, y inverted (0 = bottom). */
  const pointFromClient = (clientX: number, clientY: number): AxisPoint | null => {
    const rect = planeRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    const x = (clientX - rect.left) / rect.width;
    const y = 1 - (clientY - rect.top) / rect.height;
    return { x: Math.min(1, Math.max(0, x)), y: Math.min(1, Math.max(0, y)) };
  };

  // Plane press with a selected item: place its target immediately and keep
  // following the pointer, committing once on release ("drag on the plane").
  const handlePlanePointerDown = (event: React.PointerEvent) => {
    if (!selectedItemId) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ itemId: selectedItemId, point });
  };

  const handlePlanePointerMove = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDrag((prev) => (prev ? { itemId: prev.itemId, point } : prev));
  };

  const handlePlanePointerUp = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point && drag) onSetTargetPosition(drag.itemId, point);
    setDrag(null);
  };

  const handleMarkerPointerDown = (itemId: string) => (event: React.PointerEvent) => {
    // Keep the press from also starting a plane placement underneath.
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = {
      itemId,
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
    if (point) setDrag({ itemId: press.itemId, point });
  };

  const handleMarkerPointerUp = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (press.moved) {
      const point = pointFromClient(event.clientX, event.clientY);
      if (point) onSetTargetPosition(press.itemId, point);
      setDrag(null);
    } else {
      onToggleSelect(press.itemId);
    }
    pressRef.current.moved = false;
  };

  const endpointInput = (
    axis: AxisAxis,
    end: AxisEnd,
    key: keyof typeof labels,
    placeholder: string,
    edgeClass: string,
  ) => (
    // The pills float inside the plane, so a press on one must not fall
    // through and start a placement drag underneath.
    <div
      className={[styles.endpointOverlay, edgeClass].join(" ")}
      onPointerDown={(event) => {
        event.stopPropagation();
      }}
    >
      <Input
        type="text"
        withPadding={false}
        isBordered={false}
        fullWidth
        className={styles.endpointPill}
        maxLength={AXIS_LABEL_MAX}
        ariaLabel={`${axis === "x" ? "X" : "Y"} axis ${end} label`}
        value={labels[key]}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setLabels((prev) => ({ ...prev, [key]: next }));
          onScheduleAxisLabel(axis, end, next);
        }}
        onBlur={onFlush}
      />
    </div>
  );

  /** The marker's rendered position: the live drag point while dragging, else its target. */
  const renderedPoint = (itemId: string): AxisPoint | undefined =>
    drag?.itemId === itemId ? drag.point : question.correctPositions[itemId];

  return (
    // Pointer placement surface; the accessible path is the item rows' numeric inputs.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={planeRef}
      className={[styles.plane, selectedItemId ? styles.planeArmed : ""].filter(Boolean).join(" ")}
      onPointerDown={handlePlanePointerDown}
      onPointerMove={handlePlanePointerMove}
      onPointerUp={handlePlanePointerUp}
    >
      <span className={styles.planeAxisLineX} aria-hidden="true" />
      <span className={styles.planeAxisLineY} aria-hidden="true" />
      {endpointInput("y", "high", "yHigh", "Y high", styles.endpointTop)}
      {endpointInput("y", "low", "yLow", "Y low", styles.endpointBottom)}
      {endpointInput("x", "low", "xLow", "X low", styles.endpointLeft)}
      {endpointInput("x", "high", "xHigh", "X high", styles.endpointRight)}
      {question.items.map((item, index) => {
        const itemId = item.id;
        if (!itemId) return null;
        const point = renderedPoint(itemId);
        if (!point) return null;
        const color = resolveAxisItemColor(item.color, index);
        // Both are positioned directly on the plane so their percentage
        // coordinates/sizes resolve against the plane's box.
        const position = {
          left: `${(point.x * 100).toString()}%`,
          top: `${((1 - point.y) * 100).toString()}%`,
        };
        return (
          <span
            key={itemId}
            className={styles.markerGroup}
            style={{ "--item-color": color } as React.CSSProperties}
          >
            <span
              className={styles.toleranceCircle}
              style={{
                ...position,
                width: `${(question.tolerance * 2 * 100).toString()}%`,
                height: `${(question.tolerance * 2 * 100).toString()}%`,
              }}
              aria-hidden="true"
            />
            <button
              type="button"
              className={styles.marker}
              style={position}
              aria-pressed={selectedItemId === itemId}
              onPointerDown={handleMarkerPointerDown(itemId)}
              onPointerMove={handleMarkerPointerMove}
              onPointerUp={handleMarkerPointerUp}
              onClick={(event) => {
                // Selection is handled on pointerup; keep the click from
                // falling through to the plane underneath.
                event.stopPropagation();
              }}
            >
              <span className={styles.markerDot} aria-hidden="true" />
              <span className={styles.markerLabel}>{labelOr(item.label, index)}</span>
            </button>
          </span>
        );
      })}
    </div>
  );
};

export { AxisPlaneEditor };
