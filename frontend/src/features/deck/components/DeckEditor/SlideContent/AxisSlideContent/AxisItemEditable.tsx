/**
 * Single-row editor for an Axis item: the label plus the accessible fallback
 * for target placement — numeric X/Y inputs (0–100 %) that mirror
 * `correctPositions[itemId]`. A controlled row like `GridItemEditable`: the
 * label mirror lives here while structural ops (schedule / flush / remove /
 * set-target) come in as props from the one `useAxisEditor` in
 * `AxisSlideContent`. Drag-sortable by the grip handle to reorder the bank's
 * display order (placement targets are id-keyed, so order never affects them).
 */
import { Bars2Icon, XMarkIcon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ItemCard } from "../_shared";
import styles from "./AxisSlideContent.module.css";

interface AxisItemEditableProps {
  item: AxisItem;
  sortIndex: number;
  /** The item's assigned target point (normalized), or null when unassigned. */
  targetPosition: AxisPoint | null;
  canRemove: boolean;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetTarget: (point: AxisPoint | null) => void;
  onRemove: () => void;
}

/** Normalized [0, 1] coordinate → whole percent for the numeric inputs. */
const toPercent = (value: number): number => Math.round(value * 100);

const AxisItemEditable = ({
  item,
  sortIndex,
  targetPosition,
  canRemove,
  onScheduleLabel,
  onFlush,
  onSetTarget,
  onRemove,
}: AxisItemEditableProps) => {
  const itemId = item.id ?? "";
  const { ref, handleRef, isDragging } = useSortable({ id: itemId, index: sortIndex });

  const [label, setLabel] = useState(item.label ?? "");
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
  }

  const displayIndex = sortIndex + 1;

  const setCoordinate = (coordinate: "x" | "y", percent: number) => {
    if (!targetPosition) return;
    const clamped = Math.min(100, Math.max(0, percent)) / 100;
    onSetTarget({ ...targetPosition, [coordinate]: clamped });
  };

  return (
    <div ref={ref} className={isDragging ? styles.dragging : undefined}>
      <ItemCard
        index={sortIndex}
        tone={targetPosition ? "success" : undefined}
        removeLabel={`Remove item ${displayIndex.toString()}`}
        removeDisabled={!canRemove}
        onRemove={onRemove}
        actions={
          <span
            ref={handleRef}
            className={styles.dragHandle}
            role='button'
            aria-label={`Reorder item ${displayIndex.toString()}`}>
            <Bars2Icon className={styles.dragHandleIcon} />
          </span>
        }>
        <div className={styles.itemFields}>
          <Input
            type='text'
            fullWidth
            withPadding={false}
            maxLength={AXIS_LABEL_MAX}
            value={label}
            placeholder={`Item ${displayIndex.toString()}`}
            onChange={(event) => {
              const next = event.target.value;
              setLabel(next);
              onScheduleLabel(next);
            }}
            onBlur={onFlush}
          />
          {targetPosition ? (
            <div className={styles.targetFields}>
              <NumberInput
                compact
                id={`axis-target-x-${itemId}`}
                label='X %'
                labelPosition='labelInFront'
                value={toPercent(targetPosition.x)}
                min={0}
                max={100}
                onChange={(next) => {
                  setCoordinate("x", next);
                }}
              />
              <NumberInput
                compact
                id={`axis-target-y-${itemId}`}
                label='Y %'
                labelPosition='labelInFront'
                value={toPercent(targetPosition.y)}
                min={0}
                max={100}
                onChange={(next) => {
                  setCoordinate("y", next);
                }}
              />
              <IconBtn
                fill='ghost'
                size='xs'
                icon={<XMarkIcon />}
                aria-label={`Clear target for item ${displayIndex.toString()}`}
                onClick={() => {
                  onSetTarget(null);
                }}
              />
            </div>
          ) : (
            <button
              type='button'
              className={styles.setTarget}
              onClick={() => {
                // Seed the target at the plane's centre; the author drags or
                // types the exact spot from there.
                onSetTarget({ x: 0.5, y: 0.5 });
              }}>
              Set target position
            </button>
          )}
        </div>
      </ItemCard>
    </div>
  );
};

export { AxisItemEditable };
