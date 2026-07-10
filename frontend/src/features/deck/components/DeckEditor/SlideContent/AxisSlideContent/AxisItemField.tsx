/**
 * An Axis item's label + menu row control: the shared `ItemField` (label
 * field as popover trigger, palette/custom color, image upload/clear, delete)
 * with the Axis-specific leading action — toggling the item's target. "Set
 * target" seeds it at the plane's centre for the author to drag from there,
 * "Clear target" removes it.
 */
import { ArrowUturnLeftIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";

import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { ItemField } from "../_shared/ItemField/ItemField";

interface AxisItemFieldProps {
  item: AxisItem;
  /** 1-based row position, for the placeholder and accessible menu label. */
  displayIndex: number;
  /** The item's resolved color (override or palette default). */
  color: string;
  /** Controlled open state — the composer keeps at most one menu open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTarget: boolean;
  canRemove: boolean;
  /** Debounced label edit — just the new text; the parent patches the item. */
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  /** Assign (normalized point) or clear (null) the item's target. */
  onSetTarget: (point: AxisPoint | null) => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const AxisItemField = ({
  item,
  displayIndex,
  color,
  open,
  onOpenChange,
  hasTarget,
  canRemove,
  onScheduleLabel,
  onFlush,
  onSetTarget,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: AxisItemFieldProps) => {
  const handleToggleTarget = () => {
    onOpenChange(false);
    // Seed a fresh target at the plane's centre; the author drags or types
    // the exact spot from there.
    onSetTarget(hasTarget ? null : { x: 0.5, y: 0.5 });
  };

  return (
    <ItemField
      itemId={item.id}
      label={item.label}
      image={item.image}
      displayIndex={displayIndex}
      placeholder={`Item ${displayIndex.toString()}`}
      maxLength={AXIS_LABEL_MAX}
      color={color}
      open={open}
      onOpenChange={onOpenChange}
      canRemove={canRemove}
      primaryAction={{
        label: hasTarget ? "Clear target" : "Set target",
        icon: hasTarget ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
        pressed: hasTarget,
        onSelect: handleToggleTarget,
      }}
      onScheduleLabel={onScheduleLabel}
      onFlush={onFlush}
      onSetColor={onSetColor}
      onSetImage={onSetImage}
      onRemove={onRemove}
      openPicker={openPicker}
    />
  );
};

export { AxisItemField };
