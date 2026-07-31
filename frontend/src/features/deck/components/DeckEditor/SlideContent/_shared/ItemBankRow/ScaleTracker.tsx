import { KEYBOARD_NUDGE_STEP } from "@/features/liveSession/components/SessionBoard/content/useBoardPlacement";
import { IconBtn } from "@/shared/components/UIElements/Buttons/IconBtn";
import { formatScaleValue, positionToValue, valueToPosition } from "@/shared/utils/scaleValue";
import { QuestionMarkCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useRef, useState } from "react";
import styles from "./ScaleTracker.module.css";
interface ScaleTrackerProps {
  min: number;
  max: number;
  displayIndex: string;
  leftLabel: string;
  rightLabel: string;
  tolerance: number;
  correctValue?: number;
  onCommit: (value: number) => void;
  onScheduleAnswer: (value: number) => void;
  onClear: () => void;
}

const ScaleTracker = ({
  min,
  max,
  leftLabel,
  rightLabel,
  tolerance,
  correctValue,
  onScheduleAnswer,
  onCommit,
  onClear,
  displayIndex,
}: ScaleTrackerProps) => {
  const scored = correctValue !== undefined;

  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const midpoint = (min + max) / 2;
  const span = max - min;
  const displayValue = dragValue ?? correctValue;

  const valueFromClient = (clientX: number): number | null => {
    const rect = trackRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0) return null;
    return positionToValue((clientX - rect.left) / rect.width, min, max);
  };

  const handleTrackPointerDown = (event: React.PointerEvent) => {
    const value = valueFromClient(event.clientX);
    if (value == null) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragValue(value);
    onScheduleAnswer(value);
  };

  const handleTrackPointerMove = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = valueFromClient(event.clientX);
    if (value == null) return;
    setDragValue(value);
    onScheduleAnswer(value);
  };

  const handleTrackPointerUp = (event: React.PointerEvent) => {
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const value = valueFromClient(event.clientX) ?? dragValue;
    if (value != null) onCommit(value);
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
    onCommit(next);
  };

  return (
    <>
      {" "}
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
                aria-label={`Correct answer for statement ${displayIndex}`}
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
            onClick={onClear}
          />
        </div>
      ) : (
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<QuestionMarkCircleIcon />}
          aria-label={`Set option ${displayIndex.toString()} as scorable`}
          onClick={() => {
            onCommit(midpoint);
          }}
        />
      )}
    </>
  );
};

export { ScaleTracker };
