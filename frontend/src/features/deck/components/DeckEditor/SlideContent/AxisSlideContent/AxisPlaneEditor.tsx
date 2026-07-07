/**
 * The Axis editor's plane: a near-square X × Y surface framed by the four
 * endpoint-label inputs (empty labels fall back to placeholders, grid's
 * "Row 1" pattern), with the unplaced items in a bank beside it.
 *
 * Placement is select-then-click: tap a chip to hold it (`aria-pressed`), then
 * click the plane to drop its target at the click's normalized coordinates.
 * Placed chips can be dragged (pointer capture) or picked up again by click.
 * Every placed chip renders its tolerance circle so the accepted region is
 * visible while tuning; the circle is drawn in the same normalized space the
 * grader measures in, so what the author sees is what is graded.
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
import styles from "./AxisSlideContent.module.css";

/** Pointer travel (px) below which a chip press counts as a click, not a drag. */
const DRAG_THRESHOLD_PX = 4;

/** Display name for an item label, falling back to its 1-based position. */
const labelOr = (label: string | undefined, index: number): string =>
  label?.trim() ?? "" ? (label as string).trim() : `Item ${(index + 1).toString()}`;

interface AxisPlaneEditorProps {
  question: AxisQuestionView;
  onScheduleAxisLabel: (axis: AxisAxis, end: AxisEnd, text: string) => void;
  onSetTargetPosition: (itemId: string, point: AxisPoint | null) => void;
  onFlush: () => void;
}

const AxisPlaneEditor = ({
  question,
  onScheduleAxisLabel,
  onSetTargetPosition,
  onFlush,
}: AxisPlaneEditorProps) => {
  const planeRef = useRef<HTMLDivElement>(null);

  // The chip currently "held" for placement (bank or placed), if any.
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  // Live drag position of a placed chip while the pointer is captured.
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

  const handlePlaneClick = (event: React.MouseEvent) => {
    if (!heldItemId) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    onSetTargetPosition(heldItemId, point);
    setHeldItemId(null);
  };

  const toggleHeld = (itemId: string) => {
    setHeldItemId((held) => (held === itemId ? null : itemId));
  };

  const handleChipPointerDown = (itemId: string) => (event: React.PointerEvent) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pressRef.current = {
      itemId,
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    };
  };

  const handleChipPointerMove = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    if (
      !press.moved &&
      Math.hypot(event.clientX - press.startX, event.clientY - press.startY) <
        DRAG_THRESHOLD_PX
    ) {
      return;
    }
    press.moved = true;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDrag({ itemId: press.itemId, point });
  };

  const handleChipPointerUp = (event: React.PointerEvent) => {
    const press = pressRef.current;
    if (press.moved) {
      const point = pointFromClient(event.clientX, event.clientY);
      if (point) onSetTargetPosition(press.itemId, point);
      setDrag(null);
    } else {
      toggleHeld(press.itemId);
    }
    pressRef.current.moved = false;
  };

  const endpointInput = (
    axis: AxisAxis,
    end: AxisEnd,
    key: keyof typeof labels,
    placeholder: string,
  ) => (
    <Input
      type='text'
      withPadding={false}
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
  );

  const bankItems = question.items.filter(
    (item) => !(item.id && question.correctPositions[item.id]),
  );

  /** The chip's rendered position: the live drag point while dragging, else its target. */
  const renderedPoint = (itemId: string): AxisPoint | undefined =>
    drag?.itemId === itemId ? drag.point : question.correctPositions[itemId];

  return (
    <div className={styles.planeEditor}>
      <div className={styles.planeFrame}>
        <div className={styles.planeYLabel}>{endpointInput("y", "high", "yHigh", "Y high")}</div>
        <div className={styles.planeRow}>
          <div className={styles.planeXLabel}>{endpointInput("x", "low", "xLow", "X low")}</div>
          {/* Click-to-place surface; the accessible path is the item rows' numeric inputs. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events */}
          <div
            ref={planeRef}
            className={[styles.plane, heldItemId ? styles.planeArmed : ""]
              .filter(Boolean)
              .join(" ")}
            onClick={handlePlaneClick}>
            <span className={styles.planeAxisLineX} aria-hidden='true' />
            <span className={styles.planeAxisLineY} aria-hidden='true' />
            {question.items.map((item, index) => {
              const itemId = item.id;
              if (!itemId) return null;
              const point = renderedPoint(itemId);
              if (!point) return null;
              // Both are positioned directly on the plane so their percentage
              // coordinates/sizes resolve against the plane's box.
              const position = {
                left: `${(point.x * 100).toString()}%`,
                top: `${((1 - point.y) * 100).toString()}%`,
              };
              return (
                <span key={itemId}>
                  <span
                    className={styles.toleranceCircle}
                    style={{
                      ...position,
                      width: `${(question.tolerance * 2 * 100).toString()}%`,
                      height: `${(question.tolerance * 2 * 100).toString()}%`,
                    }}
                    aria-hidden='true'
                  />
                  <button
                    type='button'
                    className={styles.placedChip}
                    style={position}
                    aria-pressed={heldItemId === itemId}
                    onPointerDown={handleChipPointerDown(itemId)}
                    onPointerMove={handleChipPointerMove}
                    onPointerUp={handleChipPointerUp}
                    onClick={(event) => {
                      // Placement is handled on pointerup; keep the click from
                      // falling through to the plane underneath.
                      event.stopPropagation();
                    }}>
                    {labelOr(item.label, index)}
                  </button>
                </span>
              );
            })}
          </div>
          <div className={styles.planeXLabel}>
            {endpointInput("x", "high", "xHigh", "X high")}
          </div>
        </div>
        <div className={styles.planeYLabel}>{endpointInput("y", "low", "yLow", "Y low")}</div>
      </div>

      <div className={styles.bank}>
        <h5 className={styles.bankTitle}>Unplaced items</h5>
        {bankItems.length === 0 && (
          <p className={styles.bankEmpty}>Every item has a target.</p>
        )}
        {bankItems.map((item) => {
          const index = question.items.indexOf(item);
          const itemId = item.id;
          if (!itemId) return null;
          return (
            <button
              key={itemId}
              type='button'
              className={styles.bankChip}
              aria-pressed={heldItemId === itemId}
              onClick={() => {
                toggleHeld(itemId);
              }}>
              {labelOr(item.label, index)}
            </button>
          );
        })}
        {heldItemId && <p className={styles.bankHint}>Click the plane to place the target.</p>}
      </div>
    </div>
  );
};

export { AxisPlaneEditor };
