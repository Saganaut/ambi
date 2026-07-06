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
import { TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";
import { useEffect, useRef, useState } from "react";

import { ColorSwatch } from "@components/Forms/Input/ColorPicker/ColorSwatch";
import { ThemeColorSwatches } from "@components/Forms/Input/ColorPicker/ThemeColorSwatches";
import { Popover, PopoverDivider, PopoverRow } from "@components/Forms/Input/Popover/Popover";
import { Btn } from "@ui/Buttons/Btn";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { hueToHex, isHexColor, parseHue, toHexColor } from "@utils/color";
import styles from "./McqOptionEditable.module.css";

interface EditOptionToolbarProps {
  canRemove: boolean;
  handlePickFromGallery: () => void;
  hasImage: boolean;
  handleRemove: () => void;
  handleColorChange: (str: string) => void;
  handleClearImage: () => void;
  handleClose: () => void;
  displayIndex: number | string;
  previewUrl: string;
  /** Resolved color string (option override or palette default). */
  color: string;
  flush: () => void;
  /** Which edge of the anchor the popover aligns to (default "start"). */
  align?: "start" | "end";
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
  align = "start",
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

  // The current color may be a hex, an oklch() palette default, or a live
  // var(--role-*) theme reference. parseHue only understands hex/oklch, so guard
  // it: a var() (or anything non-parseable) gets a neutral hex, used solely for
  // the ColorSwatch active-highlight. The trigger swatch below shows the raw
  // color directly, so the real (resolved) color is always previewed.
  const resolvedHex =
    isHexColor(color) || color.trim().startsWith("oklch")
      ? toHexColor(hueToHex(parseHue(color)))
      : toHexColor("#888888");

  const handleColorPick = (colorPick: string) => {
    handleColorChange(colorPick);
    flush();
    setColorOpen(false);
  };

  return (
    <div
      className={`${styles.popoverWrap} ${align === "end" ? styles.alignEnd : ""}`}
      onClick={(e) => {
        e.stopPropagation();
      }}
    >
      {colorOpen && (
        <div ref={colorPopoutRef} className={styles.colorPopout}>
          <Popover role="dialog" ariaLabel="Choose option color">
            <PopoverRow>
              <ColorSwatch color={resolvedHex} onChange={handleColorPick} />
            </PopoverRow>
            <PopoverDivider />
            {/* Active theme's palette colors — stored as live var(--role-*)
                refs so the option tracks the deck/global theme. */}
            <PopoverRow>
              <ThemeColorSwatches onPick={handleColorPick} />
            </PopoverRow>
          </Popover>
        </div>
      )}
      <Popover role="dialog" ariaLabel={`Option ${displayIndex.toString()} settings`}>
        <PopoverRow className={styles.popoverHeader}>
          <IconBtn
            fill="ghost"
            size="xs"
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
            <Btn fill="ghost" size="xs" onClick={handleClearImage}>
              Clear
            </Btn>
          )}

          <PopoverDivider />

          {/* Wrapper div carries the ref so the outside-click handler can
              recognize the trigger and let its own onClick toggle state. */}
          <div ref={colorTriggerRef} className={styles.colorThumbWrap}>
            <IconBtn
              fill="ghost"
              size="xs"
              className={styles.colorThumbBtn}
              style={{ backgroundColor: color }}
              aria-label="Choose color"
              aria-expanded={colorOpen}
              aria-haspopup="dialog"
              onClick={() => {
                setColorOpen((o) => !o);
              }}
            />
          </div>

          <PopoverDivider />

          <IconBtn
            fill="ghost"
            size="xs"
            aria-label={`Remove option ${displayIndex.toString()}`}
            disabled={!canRemove}
            onClick={handleRemove}
            icon={<TrashIcon />}
          />
          <PopoverDivider />

          <IconBtn
            fill="ghost"
            icon={<XMarkIcon />}
            size="xs"
            aria-label="Close"
            onClick={handleClose}
          />
        </PopoverRow>
      </Popover>
    </div>
  );
};

export { EditOptionToolbar };
