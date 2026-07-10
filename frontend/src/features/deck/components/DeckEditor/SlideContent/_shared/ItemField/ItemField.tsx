/**
 * An item row's editable label paired with its popover menu — the shared
 * counterpart of MCQ's `OptionField`, used by Axis items (via
 * `AxisItemField`) and Place-on-Image targets. The label field is the menu's
 * trigger: focusing it opens the menu (`onFocus → onOpenChange`), and the
 * composer keeps at most one row's menu open via the controlled `open` prop.
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
 * image upload/clear, delete); the kind-specific leading action comes in as
 * `primaryAction` (e.g. Axis's set/clear-target toggle) and may be omitted.
 */
import { useState, type HTMLProps } from "react";

import { PopoverNavContext } from "@/shared/components/Popover/PopoverNavContext";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import type { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import { Input } from "@components/Forms/Input/Input/Input";
import type { AppImage } from "@deck/store/deckApi.gen";
import { useModal } from "@hooks/useModal";
import { emptyImage, isImageEmpty } from "@utils/image";
import { OptionMenuContent } from "../OptionMenu/OptionMenuContent";
import type { OptionMenuPrimaryAction } from "../OptionMenu/OptionMenu.types";
import styles from "./ItemField.module.css";

interface ItemFieldProps {
  /** Stable id of the row's entity — namespaces the field id and resyncs the
   *  local label mirror when the bound row changes. */
  itemId: string | undefined;
  label: string | undefined;
  image: AppImage | undefined;
  /** 1-based row position, for the placeholder and accessible menu label. */
  displayIndex: number;
  /** Shown when the label is empty (e.g. "Item 3", "Target 2"). */
  placeholder: string;
  maxLength: number;
  /** The row's resolved color (override or palette default). */
  color: string;
  /** Controlled open state — the composer keeps at most one menu open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canRemove: boolean;
  /** Leading kind-specific menu action; omitted for kinds with no toggle. */
  primaryAction?: OptionMenuPrimaryAction;
  /** Debounced label edit — just the new text; the parent patches the row. */
  onScheduleLabel: (label: string) => void;
  onFlush: () => void;
  onSetColor: (color: string) => void;
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  openPicker: OpenGalleryPicker;
}

const ItemField = ({
  itemId,
  label: boundLabel,
  image,
  displayIndex,
  placeholder,
  maxLength,
  color,
  open,
  onOpenChange,
  canRemove,
  primaryAction,
  onScheduleLabel,
  onFlush,
  onSetColor,
  onSetImage,
  onRemove,
  openPicker,
}: ItemFieldProps) => {
  const { openModal, closeModal } = useModal();

  // Local mirror keeps typing responsive; resync when the bound row changes.
  const [label, setLabel] = useState(boundLabel ?? "");
  const [syncedFromId, setSyncedFromId] = useState(itemId);
  if (syncedFromId !== itemId) {
    setSyncedFromId(itemId);
    setLabel(boundLabel ?? "");
  }

  const fieldId = `item-label-${itemId ?? ""}`;

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
      (picked) => {
        onSetImage(picked);
      },
      {
        title: "Upload an image",
        initialUrl: image?.externalSrc,
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
            maxLength={maxLength}
            value={label}
            placeholder={placeholder}
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
              hasImage={!isImageEmpty(image)}
              primaryAction={primaryAction}
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

export { ItemField };
export type { ItemFieldProps };
