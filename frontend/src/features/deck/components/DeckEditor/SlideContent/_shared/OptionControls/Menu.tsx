// Controller for the option's dropdown menu (correct toggle, palette colors,
// custom color, image upload/clear, delete), sourced from the per-option
// context. The menu is opened by the composer when the option's label field
// takes focus (see McqSlideContentView), so open state is controlled from
// above; this component owns the dismissal side — outside clicks and Escape —
// and all the option mutations. Clicks inside the option's own label field
// count as inside the boundary: the field is the menu's trigger, so moving
// the caret around must not dismiss it (a still-focused field re-fires no
// focus event, leaving no way to reopen). This wrapper is the menu's
// positioned anchor, so the popover opens off the old controls slot in every
// composer (option card footer, chart label) and flips to fit via
// useFlipToFit. The custom-color path hands off to the shared modal.
import { emptyImage, isImageEmpty } from "@utils/image";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import { McqOption } from "@/shared/types/Elements.types";
import { useEffect, useRef } from "react";
import { OptionMenu } from "../OptionMenu/OptionMenu";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";
import { optionLabelFieldId } from "./optionLabelFieldId";
import styles from "./OptionControls.module.css";

interface MenuProps {
  activeOption: McqOption;
  index: string;
  /** The option's position in the list — resolves its palette-default color. */
  paletteIndex: number;
  canRemove: boolean;
  isCorrect: boolean;
  /** Controlled open state — the composer opens on label focus. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToggleCorrect: () => void;
  onScheduleText: (option: McqOption) => void;
  onCommit: (option: McqOption) => void;
  onRemove: () => void;
  flush: () => void;
  openPicker: OpenGalleryPicker;
  /** Which edge of the anchor the popover aligns to (default "start"). */
  popoverAlign?: "start" | "end";
}

const Menu = ({
  activeOption,
  index,
  paletteIndex,
  canRemove,
  isCorrect,
  open,
  onOpenChange,
  onToggleCorrect,
  onScheduleText,
  onCommit,
  onRemove,
  flush,
  openPicker,
  popoverAlign,
}: MenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { openModal, closeModal } = useModal();

  // Dismissal boundary: menu subtree + the option's label field (the trigger).
  // pointerdown (not click) so the menu is gone before a press elsewhere lands.
  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menuRef.current?.contains(target)) return;
      if (document.getElementById(optionLabelFieldId(activeOption.id))?.contains(target)) return;
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
  }, [open, activeOption.id, onOpenChange]);

  const color = resolveOptionColor(activeOption.color, paletteIndex);
  const hasImage = !isImageEmpty(activeOption.image);

  const applyColor = (next: string) => {
    onScheduleText({ ...activeOption, color: next });
    flush();
  };

  const handleToggleCorrect = () => {
    onOpenChange(false);
    onToggleCorrect();
  };

  const handlePickColor = (next: string) => {
    applyColor(next);
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
            applyColor(hex);
            closeModal();
          }}
        />
      ),
    });
  };

  const handleUploadImage = () => {
    flush();
    onOpenChange(false);
    openPicker(
      (image) => {
        onCommit({ ...activeOption, image });
      },
      {
        title: "Upload an image",
        initialUrl: activeOption.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  const handleClearImage = () => {
    flush();
    onOpenChange(false);
    onCommit({ ...activeOption, image: emptyImage() });
  };

  const handleRemove = () => {
    onOpenChange(false);
    onRemove();
  };

  return (
    <div ref={menuRef} className={styles.menuAnchor}>
      {open && (
        <OptionMenu
          displayIndex={index}
          currentColor={color}
          canRemove={canRemove}
          hasImage={hasImage}
          isCorrect={isCorrect}
          align={popoverAlign}
          onToggleCorrect={handleToggleCorrect}
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

export { Menu };
