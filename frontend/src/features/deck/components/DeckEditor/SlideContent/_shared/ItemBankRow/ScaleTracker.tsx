import { KEYBOARD_NUDGE_STEP } from "@/features/liveSession/components/SessionBoard/content/useBoardPlacement";
import { formatScaleValue, positionToValue, valueToPosition } from "@/shared/utils/scaleValue";
import { useRef, useState } from "react";
import { useMountTransition } from "../../../../../../../shared/hooks/useMountTransition";
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
  color: string;
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
  displayIndex,
  color,
}: ScaleTrackerProps) => {
  const [dragValue, setDragValue] = useState<number | null>(null);
  const trackRef = useRef<HTMLDivElement>(null);
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

  //TODO: This hack to get hte transition to work is a bit of a mess.  If we use lots of animations consider integrating framer motion
  const isVisible = displayValue !== undefined && span > 0;
  const { shouldRender, hasTransitionedIn } = useMountTransition(isVisible, 0);
  return (
    <>
      {" "}
      <div
        className={styles.statementScale}
        style={color ? ({ "--background-color": color } as React.CSSProperties) : undefined}
      >
        <span className={styles.anchorCaption}>{leftLabel.length > 0 ? leftLabel : min}</span>

        <div
          ref={trackRef}
          className={styles.dragTrack}
          onPointerDown={handleTrackPointerDown}
          onPointerMove={handleTrackPointerMove}
          onPointerUp={handleTrackPointerUp}
        >
          <div className={styles.targetLine} />
          {shouldRender && (
            <span className={`${styles.invisible} ${hasTransitionedIn ? styles.visible : ""}`}>
              {displayValue && (
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
                  />{" "}
                </>
              )}

              {displayValue && (
                <span className={styles.valueReadout} aria-hidden="true">
                  {formatScaleValue(displayValue)}
                </span>
              )}
            </span>
          )}{" "}
        </div>
        <span className={styles.anchorCaption}>{rightLabel.length > 0 ? rightLabel : max}</span>
      </div>
    </>
  );
};

export { ScaleTracker };
