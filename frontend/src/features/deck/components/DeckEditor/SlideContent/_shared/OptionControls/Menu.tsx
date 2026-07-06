// The option's dropdown menu: an ellipsis trigger + the OptionMenu popover
// (palette colors, custom color, image upload/clear, delete), sourced from the
// per-option context. The trigger owns the open state and the outside-click
// boundary; the menu itself stays presentational. This wrapper is the menu's
// positioned anchor, so the popover opens off the kebab itself in every
// composer (option card, chart label) and flips to fit via useFlipToFit.
// The custom-color path hands off to the shared modal.
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, isImageEmpty } from "@utils/image";

import { CustomColorPicker } from "@components/Forms/Input/ColorPicker/CustomColorPicker";
import { useClickOutside } from "@/shared/hooks/useClickOutside";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { useModal } from "@hooks/useModal";
import { McqOption } from "@/shared/types/Elements.types";
import { useRef, useState } from "react";
import { OptionMenu } from "../OptionMenu/OptionMenu";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";
import styles from "./OptionControls.module.css";

interface MenuProps {
  activeOption: McqOption;
  index: string;
  /** The option's position in the list — resolves its palette-default color. */
  paletteIndex: number;
  canRemove: boolean;
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
  onScheduleText,
  onCommit,
  onRemove,
  flush,
  openPicker,
  popoverAlign,
}: MenuProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);
  const { openModal, closeModal } = useModal();

  const color = resolveOptionColor(activeOption.color, paletteIndex);
  const hasImage = !isImageEmpty(activeOption.image);

  const applyColor = (next: string) => {
    onScheduleText({ ...activeOption, color: next });
    flush();
  };

  const handlePickColor = (next: string) => {
    applyColor(next);
    setIsOpen(false);
  };

  const handleCustomColor = () => {
    setIsOpen(false);
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
    setIsOpen(false);
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
    setIsOpen(false);
    onCommit({ ...activeOption, image: emptyImage() });
  };

  const handleRemove = () => {
    setIsOpen(false);
    onRemove();
  };

  return (
    <div ref={menuRef} className={styles.menuAnchor}>
      <IconBtn
        fill="ghost"
        size="xs"
        className={styles.menuTrigger}
        icon={<EllipsisVerticalIcon />}
        aria-label={`Edit option ${index.toString()}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
      />
      {isOpen && (
        <OptionMenu
          displayIndex={index}
          currentColor={color}
          canRemove={canRemove}
          hasImage={hasImage}
          align={popoverAlign}
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
