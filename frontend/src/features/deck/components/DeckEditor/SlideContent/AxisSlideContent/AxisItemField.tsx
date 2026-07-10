/**
 * An Axis item's editable label paired with its popover menu — the Axis
 * counterpart of MCQ's `OptionField`. The label field is the menu's trigger:
 * focusing it opens the menu (`onFocus → onOpenChange`), and the composer
 * keeps at most one row's menu open via the controlled `open` prop.
 * Positioning, portalling, and dismissal (outside press + Escape) are handled
 * by `FloatingPopover`; the field is the popover's anchor, so it counts as
 * "inside" and moving the caret around it never dismisses.
 *
 * Focus management is off (`manageFocus={false}`) so opening the menu never
 * pulls the caret out of the field; `listNavigation` lets Up/Down step roving
 * focus through the menu's buttons (`ctx.listNav` reaches the shared
 * `OptionMenuContent` via `PopoverNavContext`).
 *
 * The menu body is the shared `OptionMenuContent` (palette + custom color,
 * image upload/clear, delete); the kind-specific primary action toggles the
 * item's target — "Set target" seeds it at the plane's centre for the author
 * to drag from there, "Clear target" removes it.
 */
import { ArrowUturnLeftIcon, ViewfinderCircleIcon } from "@heroicons/react/24/outline";
import { useState, type HTMLProps } from "react";

import { PopoverNavContext } from "@/shared/components/Popover/PopoverNavContext";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import { Input } from "@components/Forms/Input/Input/Input";
import { AXIS_LABEL_MAX } from "@deck/hooks/useAxisEditor";
import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";
import { useModal } from "@hooks/useModal";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenuContent } from "../_shared/OptionMenu/OptionMenuContent";
import styles from "./AxisSlideContent.module.css";

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
  const { openModal, closeModal } = useModal();

  // Local mirror keeps typing responsive; resync when the bound item changes.
  const [label, setLabel] = useState(item.label ?? "");
  const [syncedFromId, setSyncedFromId] = useState(item.id);
  if (syncedFromId !== item.id) {
    setSyncedFromId(item.id);
    setLabel(item.label ?? "");
  }

  const fieldId = `axis-item-label-${item.id ?? ""}`;

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
    <FloatingPopover
      openOn="controlled"
      manageFocus={false}
      listNavigation
      open={open}
      onOpenChange={onOpenChange}
      placement="bottom-start"
      offsetAmount={8}
      zIndex={100}
      renderTrigger={(triggerProps) => (
        // triggerProps carries floating-ui's callback ref (typed for a generic
        // HTMLElement); it attaches fine to a div at runtime.
        <div {...(triggerProps as HTMLProps<HTMLDivElement>)} className={styles.triggerWrap}>
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
              onOpenChange(true);
            }}
            onBlur={onFlush}
            aria-haspopup="dialog"
            aria-expanded={open}
          />
        </div>
      )}
    >
      {({ ctx }) => (
        <div style={ctx.styles}>
          <PopoverNavContext value={ctx.listNav ?? null}>
            <OptionMenuContent
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
          </PopoverNavContext>
        </div>
      )}
    </FloatingPopover>
  );
};

export { AxisItemField };
