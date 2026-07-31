// An MCQ option's editable label paired with its dropdown menu. The label field
// is the menu's trigger: focusing it opens the menu (`onFocus → onOpenChange`),
// and the composer keeps at most one option's menu open via the controlled
// `open` prop. Positioning, portalling, and dismissal (outside press + Escape)
// are handled by `FloatingPopover`; the field is the popover's anchor, so it
// counts as "inside" and moving the caret around it never dismisses.
//
// Focus management is off (`manageFocus={false}`) so opening the menu never
// pulls the caret out of the field. Keyboard access into the menu is provided by
// `listNavigation`: the field keeps focus and the caret on open, and Up/Down
// step roving focus through the menu's buttons (Enter/Space activate, Escape
// closes). `ctx.listNav` carries floating-ui's item handles down to the shared
// `OptionMenuContent` via `PopoverNavContext`.
//
// The menu body is the shared `OptionMenuContent`; the custom-color path swaps
// the popover body to the shared `CustomColorPanel` (back returns to the menu)
// and image upload hands off to the gallery picker.
import { CheckIcon } from "@heroicons/react/24/outline";
import { emptyImage, isImageEmpty } from "@utils/image";

import { PopoverNavContext } from "@/shared/components/Popover/PopoverNavContext";
import { FloatingPopover } from "@/shared/components/Popover/PopoverWrapper";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import type { AppImage } from "@deck/store/deckApi.gen";
import { useState, type HTMLProps } from "react";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";
import { CustomColorPanel } from "../OptionMenu/CustomColorPanel";
import { OptionMenuContent } from "../OptionMenu/OptionMenuContent";
import { Label } from "./Label";
import styles from "./OptionControls.module.css";

interface OptionFieldProps {
  option: McqOption;
  /** The option's position in the list — resolves its palette-default color. */
  paletteIndex: number;
  canRemove: boolean;
  isCorrect: boolean;
  /** Controlled open state — the composer keeps at most one menu open. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleCorrect: () => void;
  /** Debounced label edit — just the new text; the parent patches the option. */
  onScheduleText: (text: string) => void;
  /** Override the option's color. */
  onSetColor: (color: string) => void;
  /** Set or clear (empty AppImage) the option's image. */
  onSetImage: (image: AppImage) => void;
  onRemove: () => void;
  flush: () => void;
  openPicker: OpenGalleryPicker;
}

const OptionField = ({
  option,
  paletteIndex,
  canRemove,
  isCorrect,
  open,
  onOpenChange,
  onToggleCorrect,
  onScheduleText,
  onSetColor,
  onSetImage,
  onRemove,
  flush,
  openPicker,
}: OptionFieldProps) => {
  // Whether the popover shows the custom-color view instead of the menu.
  const [customColorOpen, setCustomColorOpen] = useState(false);

  const color = resolveOptionColor(option.color, paletteIndex);
  const hasImage = !isImageEmpty(option.image);

  // Route open-state changes so closing (dismissal included) always lands
  // back on the menu view the next time the popover opens.
  const handleOpenChange = (next: boolean) => {
    if (!next) setCustomColorOpen(false);
    onOpenChange(next);
  };

  const handleToggleCorrect = () => {
    onOpenChange(false);
    onToggleCorrect();
  };

  const handlePickColor = (next: string) => {
    onSetColor(next);
    onOpenChange(false);
  };

  const handleCustomColor = () => {
    setCustomColorOpen(true);
  };

  const handleUploadImage = () => {
    onOpenChange(false);
    openPicker(
      (image) => {
        onSetImage(image);
      },
      {
        title: "Upload an image",
        initialUrl: option.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
        // Option thumbnails are square: a gallery pick has to be re-cropped to
        // that frame too, not just an upload.
        cropGalleryPicks: true,
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
      onOpenChange={handleOpenChange}
      placement="bottom-start"
      offsetAmount={8}
      zIndex={100}
      renderTrigger={(triggerProps) => (
        // triggerProps carries floating-ui's callback ref (typed for a generic
        // HTMLElement); it attaches fine to a div at runtime.
        <div {...(triggerProps as HTMLProps<HTMLDivElement>)} className={styles.triggerWrap}>
          <Label
            option={option}
            flush={flush}
            onScheduleText={onScheduleText}
            onFocus={() => {
              onOpenChange(true);
            }}
            menuOpen={open}
          />
        </div>
      )}
    >
      {({ ctx }) => (
        <div style={ctx.styles}>
          {customColorOpen ? (
            <CustomColorPanel
              value={color}
              onPick={onSetColor}
              onBack={() => {
                setCustomColorOpen(false);
              }}
              onClose={() => {
                handleOpenChange(false);
              }}
            />
          ) : (
            <PopoverNavContext value={ctx.listNav ?? null}>
              <OptionMenuContent
                displayIndex={option.id}
                currentColor={color}
                canRemove={canRemove}
                hasImage={hasImage}
                primaryAction={{
                  label: isCorrect ? "Mark as wrong" : "Mark as correct",
                  icon: CheckIcon,
                  pressed: isCorrect,
                  onSelect: handleToggleCorrect,
                }}
                onPickColor={handlePickColor}
                onCustomColor={handleCustomColor}
                onUploadImage={handleUploadImage}
                onClearImage={handleClearImage}
                onRemove={handleRemove}
              />
            </PopoverNavContext>
          )}
        </div>
      )}
    </FloatingPopover>
  );
};

export { OptionField };
