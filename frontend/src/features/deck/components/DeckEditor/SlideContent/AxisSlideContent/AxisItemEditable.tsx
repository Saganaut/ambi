/**
 * Single-row editor for an Axis item: the palette-colored index badge, the
 * label field, and the accessible fallback for target placement — numeric X/Y
 * inputs (0–100 %) that mirror `correctPositions[itemId]` — plus a reset
 * button that clears the target. Clicking anywhere on the row selects it,
 * arming the plane for placement; focusing the label field also opens the
 * item's popover menu (clear target / delete), MCQ's option-menu pattern.
 * A controlled row like `GridItemEditable`: the label mirror lives here while
 * structural ops (schedule / flush / remove / set-target) come in as props
 * from the one `useAxisEditor` in `AxisSlideContent`. Drag-sortable by the
 * grip handle to reorder display order (placement targets are id-keyed, so
 * order never affects them).
 */
import { ArrowUturnLeftIcon, Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { ItemCard } from "../_shared";
import { AxisItemMenu } from "./AxisItemMenu";
import styles from "./AxisSlideContent.module.css";

interface AxisItemEditableProps {
  item: AxisItem;
  sortIndex: number;
  /** The item's assigned target point (normalized), or null when unassigned. */
  targetPosition: AxisPoint | null;
  /** The item's palette color — shared with its marker on the plane. */
  color: string;
  /** Whether this row is selected (armed for placement on the plane). */
  selected: boolean;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onMenuOpenChange: (open: boolean) => void;
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
  color,
  selected,
  menuOpen,
  canRemove,
  onSelect,
  onMenuOpenChange,
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
  const fieldId = `axis-item-label-${itemId}`;

  const setCoordinate = (coordinate: "x" | "y", percent: number) => {
    if (!targetPosition) return;
    const clamped = Math.min(100, Math.max(0, percent)) / 100;
    onSetTarget({ ...targetPosition, [coordinate]: clamped });
  };

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div
      ref={ref}
      className={isDragging ? styles.dragging : undefined}
      onClick={onSelect}>
      <ItemCard
        index={sortIndex}
        active={selected}
        indexColor={color}
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
            id={fieldId}
            className={styles.labelField}
            maxLength={AXIS_LABEL_MAX}
            value={label}
            placeholder={`Item ${displayIndex.toString()}`}
            onChange={(event) => {
              const next = event.target.value;
              setLabel(next);
              onScheduleLabel(next);
            }}
            onFocus={() => {
              onMenuOpenChange(true);
            }}
            onBlur={onFlush}
            aria-haspopup='dialog'
            aria-expanded={menuOpen}
          />
          <AxisItemMenu
            displayIndex={displayIndex}
            fieldId={fieldId}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            hasTarget={targetPosition != null}
            canRemove={canRemove}
            onClearTarget={() => {
              onSetTarget(null);
            }}
            onRemove={onRemove}
          />
          {targetPosition ? (
            <div className={styles.targetFields}>
              <NumberInput
                compact
                id={`axis-target-x-${itemId}`}
                label='X'
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
                label='Y'
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
                icon={<ArrowUturnLeftIcon />}
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
              Set target
            </button>
          )}
        </div>
      </ItemCard>
    </div>
  );
};

export { AxisItemEditable };
