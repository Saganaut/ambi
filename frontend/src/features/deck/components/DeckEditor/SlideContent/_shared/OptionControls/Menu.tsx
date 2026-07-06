// The option's dropdown menu: an ellipsis trigger + the shared
// EditOptionToolbar popover (image pick/clear, colour, remove), sourced from the
// per-option context. Controlled — the composer owns the open state and the
// outside-click boundary (which differs: the whole card vs. just the chart-label
// wrap), so this piece stays presentational and reusable. The popover anchors to
// the nearest positioned ancestor, which both composers provide.
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, isImageEmpty, largestUrl } from "@utils/image";

import { useClickOutside } from "@/shared/hooks/useClickOutside";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/Elements.types";
import { useRef, useState } from "react";
import { EditOptionToolbar } from "../McqOptionEditable/EditOptionToolbar";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";

interface MenuProps {
  activeOption: McqOption;
  index: string;
  canRemove: boolean;
  onScheduleText: (option: McqOption) => void;
  onCommit: (option: McqOption) => void;
  onRemove: () => void;
  flush: () => void;
  openPicker: OpenGalleryPicker;
  activeOptionId: string;
  /** Which edge of the anchor the popover aligns to (default "start"). */
  popoverAlign?: "start" | "end";
}

const Menu = ({
  activeOption,
  index,
  canRemove,
  onScheduleText,
  onCommit,
  onRemove,
  flush,
  openPicker,
  popoverAlign,
}: MenuProps) => {
  //TODO: remove this magic number, we use to have an index
  // but now that index is a string we need a number
  const MAGIC_NUMBER = 2;
  const optionKey = activeOption.id ?? "";
  const menuRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  useClickOutside(menuRef, () => setIsOpen(false), isOpen);

  const handlePickFromGallery = () => {
    flush();
    setIsOpen(false);
    openPicker(
      (image) => {
        onCommit({ ...activeOption, image });
      },
      {
        title: "Option image",
        initialUrl: activeOption.image?.externalSrc,
        cropWidth: 1,
        cropHeight: 1,
      },
    );
  };

  const handleClearImage = () => {
    flush();
    onCommit({ ...activeOption, image: emptyImage() });
  };

  const handleColorChange = (next: string) => {
    onScheduleText({ ...activeOption, color: next });
  };

  const handleRemove = () => {
    setIsOpen(false);
    onRemove();
  };
  const color = resolveOptionColor(activeOption.color, MAGIC_NUMBER);
  const hasImage = !isImageEmpty(activeOption.image);
  const previewUrl = largestUrl(activeOption.image, optionKey) ?? "";

  return (
    <div ref={menuRef}>
      <IconBtn
        fill="ghost"
        size="xs"
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
        <EditOptionToolbar
          align={popoverAlign}
          canRemove={canRemove}
          handlePickFromGallery={handlePickFromGallery}
          hasImage={hasImage}
          handleRemove={handleRemove}
          handleClearImage={handleClearImage}
          handleColorChange={handleColorChange}
          handleClose={() => {
            setIsOpen(false);
          }}
          displayIndex={index}
          previewUrl={previewUrl}
          color={color}
          flush={flush}
        />
      )}
    </div>
  );
};

export { Menu };
