/**
 * The Axis editor's plane: a near-square X × Y surface with the four
 * endpoint-label inputs overlaid as pills inside its edges (top/bottom for
 * the Y axis, left/right for the X axis — empty labels fall back to
 * placeholders, grid's "Row 1" pattern) so the plane claims all the room.
 *
 * Placement is select-then-drag: the composer holds the selected item (rows
 * and markers both select), and while an item is selected any press on the
 * plane drops — and keeps dragging — its target at the pointer's normalized
 * coordinates. Placed markers can also be dragged directly — off the plane to
 * clear their target (the marker dims while a release would do so) — or tapped
 * to toggle their row's selection; `usePlacementSurface` owns that pointer
 * bookkeeping. Every placed marker is drawn in its item's resolved color with
 * its dashed tolerance circle, in the same normalized space the grader
 * measures in, so what the author sees is what is graded.
 *
 * Coordinates are normalized [0, 1] with (0,0) the low/low corner — bottom-left
 * as rendered — hence `invertY`, which the surface hook and the markers both
 * take. The pointer-free path is the row menu's "Set target", which seeds the
 * plane's centre (see `AxisSlideContent`).
 */
import { useState } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { Input } from "@components/Forms/Input/Input/Input";
import {
  AXIS_LABEL_MAX,
  type AxisAxis,
  type AxisEnd,
  type AxisQuestionView,
} from "@deck/hooks/useAxisEditor";
import type { AxisPoint } from "@deck/store/deckApi.gen";
import { PlacementMarker, usePlacementSurface } from "../_shared";
import placement from "../_shared/placement/placement.module.css";
import styles from "./AxisSlideContent.module.css";

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
  const surface = usePlacementSurface({
    invertY: true,
    pendingKey: () => selectedItemId,
    onSurfaceCommit: onSetTargetPosition,
    onMarkerCommit: onSetTargetPosition,
    onMarkerTap: onToggleSelect,
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

  return (
    // Pointer placement surface; the pointer-free path is the row menu's
    // "Set target".
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div
      ref={surface.surfaceRef}
      className={[placement.surface, styles.plane, selectedItemId ? placement.surfaceArmed : ""]
        .filter(Boolean)
        .join(" ")}
      {...surface.surfaceProps}
    >
      <span className={styles.planeAxisLineX} aria-hidden="true" />
      <span className={styles.planeAxisLineY} aria-hidden="true" />
      {endpointInput("y", "high", "yHigh", "Y high", styles.endpointTop)}
      {endpointInput("y", "low", "yLow", "Y low", styles.endpointBottom)}
      {endpointInput("x", "low", "xLow", "X low", styles.endpointLeft)}
      {endpointInput("x", "high", "xHigh", "X high", styles.endpointRight)}
      {question.items.map((item, index) => {
        const itemId = item.id;
        const point = surface.pointFor(itemId, question.correctPositions[itemId]);
        if (!point) return null;
        const label = item.label?.trim() ?? "";
        const displayIndex = index + 1;
        return (
          <PlacementMarker
            key={itemId}
            point={point}
            invertY
            color={resolveDatumColor(item.color, index)}
            displayIndex={displayIndex}
            label={label}
            tolerance={question.tolerance}
            ariaLabel={`Item ${displayIndex.toString()}${label ? ` (${label})` : ""} — drag to move`}
            selected={selectedItemId === itemId}
            outside={surface.drag?.key === itemId && !surface.drag.inside}
            {...surface.markerProps(itemId)}
          />
        );
      })}
    </div>
  );
};

export { AxisPlaneEditor };
