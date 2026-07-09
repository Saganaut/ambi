// An MCQ option's editable label paired with its dropdown menu. The label field
// is the menu's trigger: focusing it opens the menu (`onFocus → onOpenChange`),
// and the composer keeps at most one option's menu open via the controlled
// `open` prop. Positioning, portalling, and dismissal (outside press + Escape)
// are handled by `FloatingPopover`; the field is the popover's anchor, so it
// counts as "inside" and moving the caret around it never dismisses. Focus
// management is off so opening the menu doesn't pull the caret out of the field.
// The menu body is the shared `OptionMenuContent`; the custom-color path hands
// off to the shared modal and image upload to the gallery picker.
import { CheckIcon } from "@heroicons/react/24/outline";
import { emptyImage, isImageEmpty } from "@utils/image";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import { FloatingPopover } from "@/shared/components/PopoverWrapper/PopoverWrapper";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import type { AppImage } from "@deck/store/deckApi.gen";
import { McqOption } from "@/shared/types/Elements.types";
import type { HTMLProps } from "react";
import { OptionMenuContent } from "../OptionMenu/OptionMenuContent";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";
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
  const { openModal, closeModal } = useModal();

  const color = resolveOptionColor(option.color, paletteIndex);
  const hasImage = !isImageEmpty(option.image);

  const handleToggleCorrect = () => {
    onOpenChange(false);
    onToggleCorrect();
  };

  const handlePickColor = (next: string) => {
    onSetColor(next);
    onOpenChange(false);
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
        initialUrl: option.image?.externalSrc,
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
      open={open}
      onOpenChange={onOpenChange}
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
        </div>
      )}
    </FloatingPopover>
  );
};

export { OptionField };
