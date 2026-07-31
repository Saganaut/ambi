/**
 * Single-row editor for a Scales statement: the label field plus the
 * statement's own copy of the scale as a continuous drag track — the 1-D
 * analogue of the Axis plane. Pointerdown places the statement's target at
 * the pointer, dragging follows it (debounced), and release commits; the
 * marker itself is a keyboard slider (ArrowLeft/ArrowRight nudge by 2 % of
 * the span, Home/End jump to the ends). A tolerance band centered on the
 * marker shows the accepted region in the same units the grader measures,
 * so what the author sees is what is graded. A scored statement gets a
 * success-tinted outline via `ItemCard`'s `tone`.
 *
 * The label is the shared `ItemField` — focusing it opens the row's popover
 * menu, and the composer keeps at most one open. A statement carries no color
 * and no image, so that menu narrows to Delete: removal lives there, not on a
 * standalone button, which is the one removal affordance every other item bank
 * offers.
 *
 * The numeric "Answer" field is the always-available precise and accessible
 * entry, with the X button as the one clearing affordance; the "Set answer"
 * button seeds unscored rows with the scale midpoint.
 *
 * A controlled row: the answer-field mirror lives here (the label mirror is
 * `ItemField`'s) while structural ops (schedule / commit / clear / flush /
 * remove) come in as props from the one `useScalesEditor` in
 * `ScalesSlideContent`, so every write funnels through a single draft +
 * debounce buffer.
 *
 * Statement order is display-only — each statement is keyed by id in the
 * content's `correctValues` — so rows are not drag-sortable (unlike Ranking,
 * where order is the answer).
 */
import { useRef, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";

import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import type { ScaleItem } from "@deck/store/deckApi.gen";
import { SCALES_STATEMENT_LABEL_MAX } from "@deck/hooks/useScalesEditor";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ItemCard, ItemField } from "../_shared";
import { formatScaleValue, positionToValue, valueToPosition } from "@/shared/utils/scaleValue";
import styles from "./ScalesSlideContent.module.css";

/** Arrow-key nudge, as a fraction of the span (the axis-board precedent). */
const KEYBOARD_NUDGE_STEP = 0.02;

interface ScaleStatementEditableProps {
  statement: ScaleItem;
  sortIndex: number;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  /** The statement's correct answer in scale units, or undefined while unscored. */
  correctValue: number | undefined;
  /** Scale definition — drives the track mapping and the numeric-field bounds. */
  min: number;
  max: number;
  /** ± margin in scale units, rendered as the band around the marker. */
  tolerance: number;
  /** Anchor labels echoed beside the statement's scale. */
  leftLabel: string;
  rightLabel: string;
  onMenuOpenChange: (open: boolean) => void;
  /** Debounced label edit — just the new text; the parent patches the statement. */
  onScheduleLabel: (label: string) => void;
  /** Immediate target set (drag release, keyboard nudge, or "Set answer"). */
  onCommitCorrectValue: (value: number) => void;
  /** Debounced target edit (mid-drag, or the numeric field). */
  onScheduleCorrectValue: (value: number) => void;
  onClearCorrectValue: () => void;
  onFlush: () => void;
  onRemove: () => void;
}

const ScaleStatementEditable = ({
  statement,
  sortIndex,
  menuOpen,
  canRemove,
  correctValue,
  min,
  max,
  tolerance,
  leftLabel,
  rightLabel,
  onMenuOpenChange,
  onScheduleLabel,
  onCommitCorrectValue,
  onScheduleCorrectValue,
  onClearCorrectValue,
  onFlush,
  onRemove,
}: ScaleStatementEditableProps) => {
  const scored = correctValue !== undefined;
  // "Set answer" seeds the scale's midpoint so a freshly-scored statement
  // starts on a sensible in-range default rather than 0 / NaN.
  const midpoint = (min + max) / 2;

  const trackRef = useRef<HTMLDivElement>(null);
  // Live value while the pointer is captured on the track — the marker follows
  // it so the drag stays responsive while writes debounce behind it.
  const [dragValue, setDragValue] = useState<number | null>(null);

  // Local mirror for the numeric "Answer" field, resynced whenever the
  // committed target changes (a drag release or keyboard nudge must not leave
  // the field showing a stale number).
  const [target, setTarget] = useState(correctValue ?? midpoint);
  const [syncedFromId, setSyncedFromId] = useState(statement.id);
  const [syncedFromValue, setSyncedFromValue] = useState(correctValue);

  // Resync the local mirrors when this row is reused for a different statement
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== statement.id) {
    setSyncedFromId(statement.id);
    setTarget(correctValue ?? midpoint);
    setSyncedFromValue(correctValue);
  } else if (syncedFromValue !== correctValue) {
    setSyncedFromValue(correctValue);
    setTarget(correctValue ?? midpoint);
  }

  const displayIndex = sortIndex + 1;
  /** The marker's rendered value: the live drag value while dragging, else the target. */
  const displayValue = dragValue ?? correctValue;

  /** Scale-unit value at a pointer position, clamped onto the track. */
  const valueFromClient = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return positionToValue((clientX - rect.left) / rect.width, min, max);
  };

  // Track press: place the target immediately and keep following the pointer,
  // committing once on release ("drag along the track").
  const handleTrackPointerDown = (event: React.PointerEvent) => {
    const value = valueFromClient(event.clientX);
    if (value == null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragValue(value);
    onScheduleCorrectValue(value);
  };

  const handleTrackPointerMove = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = valueFromClient(event.clientX);
    if (value == null) return;
    setDragValue(value);
    onScheduleCorrectValue(value);
  };

  const handleTrackPointerUp = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = valueFromClient(event.clientX) ?? dragValue;
    if (value != null) onCommitCorrectValue(value);
    setDragValue(null);
  };

  const handleMarkerKeyDown = (event: React.KeyboardEvent) => {
    if (correctValue === undefined) return;
    const position = valueToPosition(correctValue, min, max);
    let next: number;
    switch (event.key) {
      case "ArrowLeft":
        next = positionToValue(position - KEYBOARD_NUDGE_STEP, min, max);
        break;
      case "ArrowRight":
        next = positionToValue(position + KEYBOARD_NUDGE_STEP, min, max);
        break;
      case "Home":
        next = min;
        break;
      case "End":
        next = max;
        break;
      default:
        return;
    }
    event.preventDefault();
    onCommitCorrectValue(next);
  };

  const span = max - min;

  return (
    <ItemCard index={sortIndex} tone={scored ? "success" : undefined}>
      <div className={styles.statementBody}>
        <ItemField
          itemId={statement.id}
          label={statement.label}
          displayIndex={displayIndex}
          placeholder={`Statement ${displayIndex.toString()}`}
          maxLength={SCALES_STATEMENT_LABEL_MAX}
          open={menuOpen}
          onOpenChange={onMenuOpenChange}
          canRemove={canRemove}
          onScheduleLabel={onScheduleLabel}
          onFlush={onFlush}
          onRemove={onRemove}
        />
        <div className={styles.statementScale}>
          <span className={styles.anchorCaption}>
            {leftLabel.length > 0 ? leftLabel : min}
          </span>
          {/* Pointer placement surface; the accessible path is the marker
              slider and the numeric "Answer" field. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={trackRef}
            className={styles.dragTrack}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}>
            <div className={styles.targetLine} />
            {displayValue !== undefined && span > 0 && (
              <>
                <span
                  className={styles.toleranceBand}
                  style={{
                    left: `${(valueToPosition(displayValue, min, max) * 100).toString()}%`,
                    width: `${(((tolerance * 2) / span) * 100).toString()}%`,
                  }}
                  aria-hidden='true'
                />
                <button
                  type='button'
                  // A real button so it's focusable/clickable everywhere; the
                  // slider role carries the value semantics for AT.
                  // eslint-disable-next-line jsx-a11y/role-supports-aria-props
                  role='slider'
                  className={styles.marker}
                  style={{
                    left: `${(valueToPosition(displayValue, min, max) * 100).toString()}%`,
                  }}
                  aria-valuemin={min}
                  aria-valuemax={max}
                  aria-valuenow={displayValue}
                  aria-valuetext={formatScaleValue(displayValue)}
                  aria-label={`Correct answer for statement ${displayIndex.toString()}`}
                  onKeyDown={handleMarkerKeyDown}
                />
              </>
            )}
          </div>
          <span className={styles.anchorCaption}>
            {rightLabel.length > 0 ? rightLabel : max}
          </span>
          {displayValue !== undefined && span > 0 && (
            <span className={styles.valueReadout} aria-hidden='true'>
              {formatScaleValue(displayValue)}
            </span>
          )}
        </div>
        {scored ? (
          <div className={styles.targetField}>
            <NumberInput
              label='Answer'
              id={`scales-target-${statement.id ?? sortIndex.toString()}`}
              labelPosition='labelInFront'
              value={target}
              min={min}
              max={max}
              onChange={(next) => {
                setTarget(next);
                onScheduleCorrectValue(next);
              }}
              onBlur={onFlush}
            />
            <IconBtn
              fill='ghost'
              size='xs'
              icon={<XMarkIcon />}
              aria-label={`Clear correct answer for statement ${displayIndex.toString()}`}
              onClick={onClearCorrectValue}
            />
          </div>
        ) : (
          <Btn
            fill='ghost'
            size='xs'
            onClick={() => {
              setTarget(midpoint);
              onCommitCorrectValue(midpoint);
            }}>
            Set answer
          </Btn>
        )}
      </div>
    </ItemCard>
  );
};

export { ScaleStatementEditable };
