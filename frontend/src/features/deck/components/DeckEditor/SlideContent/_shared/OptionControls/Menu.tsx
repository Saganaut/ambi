// The option's dropdown menu: an ellipsis trigger + the shared
// EditOptionToolbar popover (image pick/clear, colour, remove), sourced from the
// per-option context. Controlled — the composer owns the open state and the
// outside-click boundary (which differs: the whole card vs. just the chart-label
// wrap), so this piece stays presentational and reusable. The popover anchors to
// the nearest positioned ancestor, which both composers provide.
import { EllipsisVerticalIcon } from "@heroicons/react/24/solid";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { emptyImage, isImageEmpty, largestUrl } from "@utils/image";

import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { McqOption } from "@/shared/types/elements";
import { EditOptionToolbar } from "../McqOptionEditable/EditOptionToolbar";
import { resolveOptionColor } from "../McqOptionEditable/optionColor";

interface MenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  activeOption: McqOption;
  index: number;
  canRemove: boolean;
  onScheduleText: (option: McqOption) => void;
  onCommit: (option: McqOption) => void;
  onRemove: () => void;
  flush: () => void;
  openPicker: OpenGalleryPicker;
  activeOptionId: string;
}

const Menu = ({
  isOpen,
  activeOption,
  onOpenChange,
  index,
  canRemove,
  onScheduleText,
  onCommit,
  onRemove,
  flush,
  openPicker,
}: MenuProps) => {
  const optionKey = activeOption.id ?? "";

  /** Flush + close before opening the picker so the popover's document-level
   *  outside-click listener is gone before the modal renders. */
  const handlePickFromGallery = () => {
    flush();
    onOpenChange(false);
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
    onOpenChange(false);
    onRemove();
  };

  const color = resolveOptionColor(activeOption.color, index);
  const hasImage = !isImageEmpty(activeOption.image);
  const previewUrl = largestUrl(activeOption.image, optionKey) ?? "";
  const displayIndex = index >= 0 ? index + 1 : 0;

  return (
    <>
      <IconBtn
        fill="ghost"
        size="xs"
        icon={<EllipsisVerticalIcon />}
        aria-label={`Edit option ${displayIndex.toString()}`}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        onClick={(e) => {
          e.stopPropagation();
          onOpenChange(!isOpen);
        }}
      />
      {isOpen && (
        <EditOptionToolbar
          canRemove={canRemove}
          handlePickFromGallery={handlePickFromGallery}
          hasImage={hasImage}
          handleRemove={handleRemove}
          handleClearImage={handleClearImage}
          handleColorChange={handleColorChange}
          handleClose={() => {
            onOpenChange(false);
          }}
          displayIndex={displayIndex}
          previewUrl={previewUrl}
          color={color}
          flush={flush}
        />
      )}
    </>
  );
};

export { Menu };
