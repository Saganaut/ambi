/**
 * Single-row editor for an Axis item: the palette-colored index badge, the
 * label field, an image thumbnail when one is set, and the accessible
 * fallback for target placement — numeric X/Y inputs (0–100 %) that mirror
 * `correctPositions[itemId]`. Clicking anywhere on the row selects it,
 * arming the plane for placement; focusing the label field also opens the
 * item's popover menu (set/clear target, color, image, delete), MCQ's
 * option-menu pattern. A controlled row like `GridItemEditable`: the label
 * mirror lives here while structural ops (schedule / flush / remove /
 * set-target / color / image) come in as props from the one `useAxisEditor`
 * in `AxisSlideContent`. Drag-sortable by the grip handle to reorder display
 * order (placement targets are id-keyed, so order never affects them).
 */
import { Bars2Icon } from "@heroicons/react/24/outline";
import { useSortable } from "@dnd-kit/react/sortable";
import { useState } from "react";

import { Input } from "@components/Forms/Input/Input/Input";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { resolveImageUrl } from "@utils/image";
import { ItemCard } from "../_shared";
import { AxisItemMenu } from "./AxisItemMenu";
import styles from "./AxisSlideContent.module.css";

interface AxisItemEditableProps {
  item: AxisItem;
  sortIndex: number;
  /** The item's assigned target point (normalized), or null when unassigned. */
  targetPosition: AxisPoint | null;
  /** The item's resolved color — shared with its marker on the plane. */
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
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
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
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
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
  const thumbnailSrc = resolveImageUrl(item.image, "SM", itemId, 200, 200, false);

  const setCoordinate = (coordinate: "x" | "y", percent: number) => {
    if (!targetPosition) return;
    const clamped = Math.min(100, Math.max(0, percent)) / 100;
    onSetTarget({ ...targetPosition, [coordinate]: clamped });
  };

  return (
    // Row-wide selection target; the keyboard path is the label field's focus.
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions, jsx-a11y/click-events-have-key-events
    <div ref={ref} className={isDragging ? styles.dragging : undefined} onClick={onSelect}>
      <ItemCard
        index={sortIndex}
        active={selected}
        indexColor={color}
        actions={
          <span
            ref={handleRef}
            className={styles.dragHandle}
            role="button"
            aria-label={`Reorder item ${displayIndex.toString()}`}
          >
            <Bars2Icon className={styles.dragHandleIcon} />
          </span>
        }
      >
        <div className={styles.itemFields}>
          <Input
            type="text"
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
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
          />
          <AxisItemMenu
            item={item}
            displayIndex={displayIndex}
            fieldId={fieldId}
            color={color}
            open={menuOpen}
            onOpenChange={onMenuOpenChange}
            hasTarget={targetPosition != null}
            canRemove={canRemove}
            onSetTarget={onSetTarget}
            onSetColor={onSetColor}
            onSetImage={onSetImage}
            onRemove={onRemove}
            openPicker={openPicker}
          />
          {thumbnailSrc && <img className={styles.itemThumbnail} src={thumbnailSrc} alt="" />}
          {targetPosition && (
            <div className={styles.targetFields}>
              <NumberInput
                compact
                id={`axis-target-x-${itemId}`}
                label="X"
                labelPosition="labelInFront"
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
                label="Y"
                labelPosition="labelInFront"
                value={toPercent(targetPosition.y)}
                min={0}
                max={100}
                onChange={(next) => {
                  setCoordinate("y", next);
                }}
              />
            </div>
          )}
        </div>
      </ItemCard>
    </div>
  );
};

export { AxisItemEditable };
