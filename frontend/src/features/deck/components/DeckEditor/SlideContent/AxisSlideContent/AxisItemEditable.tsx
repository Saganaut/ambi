/**
 * One item row in the Axis editor's bank: the shared `PlacementRow` in the
 * item's resolved color (the same fill its marker carries on the plane),
 * `scored` once the item has a target point, and carrying the kind's leading
 * menu entry — "Set target" seeds the plane's centre, "Clear target" drops the
 * target again, the pointer-free placement path.
 *
 * A controlled row: which row is armed and which menu is open live in the one
 * `useSlideComposerState` in `AxisSlideContent`, and every write funnels
 * through the single `useAxisEditor` there.
 */
import { ArrowUturnLeftIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { PlacementRow, type Identified } from "../_shared";

interface AxisItemEditableProps {
  item: Identified<AxisItem>;
  sortIndex: number;
  /** The item's target point, or undefined while it has none. */
  targetPosition: AxisPoint | undefined;
  /** Whether this row is armed — a press on the plane places its target. */
  selected: boolean;
  /** Whether this row's popover menu is open (at most one per slide). */
  menuOpen: boolean;
  canRemove: boolean;
  onSelect: () => void;
  onMenuOpenChange: (open: boolean) => void;
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  /** Set the item's target point, or clear it (null). */
  onSetTargetPosition: (point: AxisPoint | null) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const AxisItemEditable = ({
  item,
  sortIndex,
  targetPosition,
  selected,
  menuOpen,
  canRemove,
  onSelect,
  onMenuOpenChange,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onSetTargetPosition,
  onRemove,
  openPicker,
}: AxisItemEditableProps) => {
  const hasTarget = targetPosition != null;
  const displayIndex = sortIndex + 1;

  return (
    <PlacementRow
      item={item}
      index={sortIndex}
      color={resolveDatumColor(item.color, sortIndex)}
      itemNoun="Item"
      labelMaxLength={AXIS_LABEL_MAX}
      scored={hasTarget}
      draggable
      gripLabel={`Reorder item ${displayIndex.toString()}`}
      selected={selected}
      menuOpen={menuOpen}
      canRemove={canRemove}
      primaryAction={{
        label: hasTarget ? "Clear target" : "Set target",
        icon: hasTarget ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
        pressed: hasTarget,
        onSelect: () => {
          onMenuOpenChange(false);
          // Seed a fresh target at the plane's centre; the author drags the
          // exact spot from there.
          onSetTargetPosition(hasTarget ? null : { x: 0.5, y: 0.5 });
        },
      }}
      onSelect={onSelect}
      onMenuOpenChange={onMenuOpenChange}
      onScheduleLabel={onScheduleLabel}
      onFlush={onFlush}
      onSetColor={onSetColor}
      onSetImage={onSetImage}
      onRemove={onRemove}
      openPicker={openPicker}
    />
  );
};

export { AxisItemEditable };
