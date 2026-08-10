/**
 * Single-row editor for a Scales statement
 */
import { useRef, useState } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { formatScaleValue, positionToValue, valueToPosition } from "@/shared/utils/scaleValue";
import { SCALES_STATEMENT_LABEL_MAX, type ScaleBankItem } from "@deck/hooks/useScalesEditor";
import type { AppImage } from "@deck/store/deckApi.gen";
import { AppImg } from "@components/Images/AppImg";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, resolveImageUrl } from "@utils/image";
import { ItemField, SortableItemCard } from "../_shared";
import styles from "./ScalesSlideContent.module.css";

/** Arrow-key nudge, as a fraction of the span (the axis-board precedent). */
const KEYBOARD_NUDGE_STEP = 0.02;

interface ScaleStatementEditableProps {
  statement: ScaleBankItem;
  sortIndex: number;
  menuOpen: boolean;
  canRemove: boolean;
  correctValue: number | undefined;
  min: number;
  max: number;
  tolerance: number;
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
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
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
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
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
  const [syncedFromId, setSyncedFromId] = useState(statement.id);
  const [syncedFromValue, setSyncedFromValue] = useState(correctValue);

  // Resync the local mirrors when this row is reused for a different statement
  // ("derive state during render" — safe when the value differs).
  if (syncedFromId !== statement.id) {
    setSyncedFromId(statement.id);
    setSyncedFromValue(correctValue);
  } else if (syncedFromValue !== correctValue) {
    setSyncedFromValue(correctValue);
  }

  const displayIndex = sortIndex + 1;
  /** The marker's rendered value: the live drag value while dragging, else the target. */
  const displayValue = dragValue ?? correctValue;

  // Styles the index pill and, via a CSS var, the row chrome.
  const color = resolveDatumColor(statement.color, sortIndex);
  const thumbnailSrc = resolveImageUrl(statement.image, "SM", statement.id, 200, 200, false);

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
    <SortableItemCard
      id={statement.id}
      index={sortIndex}
      color={color}
      itemNoun="statement"
      scored={scored}
    >
      <div className={styles.statementBody}>
        {thumbnailSrc && (
          <span className={styles.statementThumbnailWrap}>
            <AppImg className={styles.statementThumbnail} src={thumbnailSrc} alt="" fallbackSeed={statement.id} />
            <IconBtn
              fill="ghost"
              size="xs"
              className={styles.statementThumbnailClear}
              icon={<XMarkIcon />}
              aria-label={`Remove statement ${displayIndex.toString()} image`}
              onClick={(event) => {
                event.stopPropagation();
                onSetImage(emptyImage());
              }}
            />
          </span>
        )}
        <div className={styles.statementLabelField}>
          <ItemField
            itemId={statement.id}
            label={statement.label}
            image={statement.image}
            displayIndex={displayIndex}
            placeholder={`Statement ${displayIndex.toString()}`}
            maxLength={SCALES_STATEMENT_LABEL_MAX}
            color={color}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            canRemove={canRemove}
            onScheduleLabel={onScheduleLabel}
            onFlush={onFlush}
            onSetColor={onSetColor}
            onSetImage={onSetImage}
            onRemove={onRemove}
            openPicker={openPicker}
          />
        </div>
        <div className={styles.statementScale}>
          <span className={styles.anchorCaption}>{leftLabel.length > 0 ? leftLabel : min}</span>
          {/* Pointer placement surface; the accessible path is the marker
                slider and the numeric "Answer" field. */}
          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={trackRef}
            className={styles.dragTrack}
            onPointerDown={handleTrackPointerDown}
            onPointerMove={handleTrackPointerMove}
            onPointerUp={handleTrackPointerUp}
          >
            <div className={styles.targetLine} />
            {displayValue !== undefined && span > 0 && (
              <>
                <span
                  className={styles.toleranceBand}
                  style={{
                    left: `${(valueToPosition(displayValue, min, max) * 100).toString()}%`,
                    width: `${(((tolerance * 2) / span) * 100).toString()}%`,
                  }}
                  aria-hidden="true"
                />
                <button
                  type="button"
                  // A real button so it's focusable/clickable everywhere; the
                  // slider role carries the value semantics for AT.
                  // eslint-disable-next-line jsx-a11y/role-supports-aria-props
                  role="slider"
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
          <span className={styles.anchorCaption}>{rightLabel.length > 0 ? rightLabel : max}</span>
          {displayValue !== undefined && span > 0 && (
            <span className={styles.valueReadout} aria-hidden="true">
              {formatScaleValue(displayValue)}
            </span>
          )}
        </div>
        {scored ? (
          <div className={styles.targetField}>
            <IconBtn
              fill="ghost"
              size="xs"
              icon={<XMarkIcon />}
              aria-label={`Clear correct answer for statement ${displayIndex.toString()}`}
              onClick={onClearCorrectValue}
            />
          </div>
        ) : (
          <IconBtn
            fill="ghost"
            size="xs"
            icon={<QuestionMarkCircleIcon />}
            aria-label={`Set option ${displayIndex.toString()} as scorable`}
            onClick={() => {
              onCommitCorrectValue(midpoint);
            }}
          />
        )}
      </div>
    </SortableItemCard>
  );
};

export { ScaleStatementEditable };
