// Single-line floating editor for one MCQ option. Lives inside the option
// card's popover. The row contains the image-thumb trigger, an optional
// Clear button, a color-thumb trigger, remove, and close. The URL field
// moved into the GalleryPicker modal (the same surface as gallery picks)
// so the toolbar can stay one row tall.
//
// The color swatch is hidden by default and pops out *above* the toolbar
// only when the color-thumb trigger is clicked. Outside-click closes the
// popout without dismissing the surrounding toolbar.
//
// Color: option.color is stored as a CSS color string. Legacy values may
// be hex (from the old native color input); the parent palette default is
// oklch(0.65 0.18 H). We parse hue out of either format for the picker
// and always write back oklch so storage normalizes over time.
import { useEffect, useRef, useState } from "react";
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import type { HexColor } from "@uiw/color-convert";

import styles from "./McqOptionEditable.module.css";
import { hueToHex, parseHue, toHexColor } from "@utils/color";
import { Btn } from "@common/Buttons/Btn";
import { IconBtn } from "@common/Buttons/IconBtn";
import { ColorSwatch } from "@components/Forms/Input/ColorPicker/ColorSwatch";
import {
  Popover,
  PopoverRow,
  PopoverDivider,
} from "@components/Forms/Input/Popover/Popover";

interface EditOptionToolbarProps {
  canRemove: boolean;
  handlePickFromGallery: () => void;
  hasImage: boolean;
  handleRemove: () => void;
  handleColorChange: (str: string) => void;
  handleClearImage: () => void;
  handleClose: () => void;
  displayIndex: number;
  previewUrl: string;
  /** Resolved color string (option override or palette default). */
  color: string;
  flush: () => void;
}

const EditOptionToolbar = ({
  canRemove,
  handlePickFromGallery,
  hasImage,
  handleRemove,
  handleColorChange,
  handleClearImage,
  handleClose,
  displayIndex,
  previewUrl,
  color,
  flush,
}: EditOptionToolbarProps) => {
  const [colorOpen, setColorOpen] = useState(false);
  const colorPopoutRef = useRef<HTMLDivElement>(null);
  const colorTriggerRef = useRef<HTMLDivElement>(null);

  // Outside-click for the color popout only. The toolbar's outer wrap
  // already stops propagation so the parent card's outside-click closer
  // won't fire here — we just need to know when to retract the swatch.
  useEffect(() => {
    if (!colorOpen) return;
    const handlePointerDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (colorPopoutRef.current?.contains(target)) return;
      if (colorTriggerRef.current?.contains(target)) return;
      setColorOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [colorOpen]);

  const resolvedHex = toHexColor(hueToHex(parseHue(color)));

  const handleColorPick = (colorPick: HexColor) => {
    handleColorChange(colorPick);
    flush();
    setColorOpen(false);
  };

  return (
    <div
      className={styles.popoverWrap}
      onClick={(e) => {
        e.stopPropagation();
      }}>
      {colorOpen && (
        <div ref={colorPopoutRef} className={styles.colorPopout}>
          <Popover role='dialog' ariaLabel='Choose option color'>
            <PopoverRow>
              <ColorSwatch color={resolvedHex} onChange={handleColorPick} />
            </PopoverRow>
          </Popover>
        </div>
      )}
      <Popover
        role='dialog'
        ariaLabel={`Option ${displayIndex.toString()} settings`}>
        <PopoverRow className={styles.popoverHeader}>
          <IconBtn
            fill='ghost'
            size='xs'
            className={styles.imageThumbBtn}
            style={
              previewUrl
                ? {
                    backgroundImage: `url(${previewUrl})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                    backgroundRepeat: "no-repeat",
                  }
                : undefined
            }
            aria-label={hasImage ? "Change image" : "Pick image"}
            onClick={handlePickFromGallery}
            icon={hasImage ? undefined : <PlusIcon />}
          />
          {hasImage && (
            <Btn fill='ghost' size='xs' onClick={handleClearImage}>
              Clear
            </Btn>
          )}

          <PopoverDivider />

          {/* Wrapper div carries the ref so the outside-click handler can
              recognize the trigger and let its own onClick toggle state. */}
          <div ref={colorTriggerRef} className={styles.colorThumbWrap}>
            <IconBtn
              fill='ghost'
              size='xs'
              className={styles.colorThumbBtn}
              style={{ backgroundColor: resolvedHex }}
              aria-label='Choose color'
              aria-expanded={colorOpen}
              aria-haspopup='dialog'
              onClick={() => {
                setColorOpen((o) => !o);
              }}
            />
          </div>

          <PopoverDivider />

          <IconBtn
            fill='ghost'
            size='xs'
            aria-label={`Remove option ${displayIndex.toString()}`}
            disabled={!canRemove}
            onClick={handleRemove}
            icon={<TrashIcon />}
          />
          <PopoverDivider />

          <IconBtn
            fill='ghost'
            icon={<XMarkIcon />}
            size='xs'
            aria-label='Close'
            onClick={handleClose}
          />
        </PopoverRow>
      </Popover>
    </div>
  );
};

export { EditOptionToolbar };
