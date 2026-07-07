/**
 * Per-item popover menu for Axis item rows — the same focus-opened pattern as
 * MCQ's option menu (`OptionControls/Menu`): the composer opens it when the
 * row's label field takes focus, this controller owns dismissal (outside
 * pointerdown and Escape) with the label field counted inside the boundary
 * (it is the trigger — moving the caret must not dismiss the menu). The menu
 * itself is the shared `OptionMenu` (palette + custom color, image
 * upload/clear, delete); the kind-specific primary action toggles the item's
 * target — "Set target" seeds it at the plane's centre for the author to drag
 * or type exact coordinates, "Clear target" removes it.
 */
import { ArrowUturnLeftIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef } from "react";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenu } from "../_shared/OptionMenu/OptionMenu";
import styles from "./AxisSlideContent.module.css";

interface AxisItemMenuProps {
  item: AxisItem;
  /** 1-based row position, for the accessible menu label. */
  displayIndex: number;
  /** DOM id of the row's label input — the menu's trigger, inside the dismissal boundary. */
  fieldId: string;
  /** The item's resolved color (override or palette default). */
  color: string;
  /** Controlled open state — the composer opens on label focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  hasTarget: boolean;
  canRemove: boolean;
  /** Assign (normalized point) or clear (null) the item's target. */
  onSetTarget: (point: AxisPoint | null) => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const AxisItemMenu = ({
  item,
  displayIndex,
  fieldId,
  color,
  open,
  onOpenChange,
  hasTarget,
  canRemove,
  onSetTarget,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: AxisItemMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModal();

  // Dismissal boundary: menu subtree + the row's label field (the trigger).
  // pointerdown (not click) so the menu is gone before a press elsewhere lands.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      if (document.getElementById(fieldId)?.contains(target)) return;
      onOpenChange(false);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, fieldId, onOpenChange]);

  const handleToggleTarget = () => {
    onOpenChange(false);
    // Seed a fresh target at the plane's centre; the author drags or types
    // the exact spot from there.
    onSetTarget(hasTarget ? null : { x: 0.5, y: 0.5 });
  };

  const handlePickColor = (next: string) => {
    onOpenChange(false);
    onSetColor(next);
  };

  const handleCustomColor = () => {
    onOpenChange(false);
    openModal({
      title: "Custom color",
      content: (
        <CustomColorPicker
          initialColor={color}
          onApply={(hex) => {
            onSetColor(hex);
            closeModal();
          }}
        />
      ),
    });
  };

  const handleUploadImage = () => {
    onOpenChange(false);
    openPicker(
      (image) => {
        onSetImage(image);
      },
      {
        title: "Upload an image",
        initialUrl: item.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  const handleClearImage = () => {
    onOpenChange(false);
    onSetImage(emptyImage());
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <div ref={anchorRef} className={styles.menuAnchor}>
      {open && (
        <OptionMenu
          displayIndex={displayIndex.toString()}
          currentColor={color}
          canRemove={canRemove}
          hasImage={!isImageEmpty(item.image)}
          primaryAction={{
            label: hasTarget ? "Clear target" : "Set target",
            icon: hasTarget ? ArrowUturnLeftIcon : ViewfinderCircleIcon,
            pressed: hasTarget,
            onSelect: handleToggleTarget,
          }}
          onPickColor={handlePickColor}
          onCustomColor={handleCustomColor}
          onUploadImage={handleUploadImage}
          onClearImage={handleClearImage}
          onRemove={handleRemove}
        />
      )}
    </div>
  );
};

export { AxisItemMenu };
