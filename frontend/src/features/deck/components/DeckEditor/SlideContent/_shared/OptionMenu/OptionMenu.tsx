// The per-option dropdown menu (opened by OptionControls/Menu when the
// option's label field takes focus). Purely presentational — the controller
// owns the open state and outside-click boundary. Contents follow the
// option-menu design: the correct-answer toggle, then a "Color" section with
// the shared option palette plus a dashed "+" chip that hands off to the
// custom color picker, then upload / clear-image / delete actions. Anchors to
// the controller's wrapper (the positioned ancestor) and flips up /
// end-aligns as needed to stay inside the clipping container.
import { CheckIcon, PhotoIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";

import { useRef } from "react";

import { buildOptionPalette } from "@/shared/components/Charts/optionPalette";
import { Popover } from "@components/Forms/Input/Popover/Popover";
import type { MenuAlign } from "@/shared/components/Charts/Chart.types";
import styles from "./OptionMenu.module.css";
import { useFlipToFit } from "./useFlipToFit";

interface OptionMenuProps {
  /** Display identifier used for the accessible menu label. */
  displayIndex: string;
  /** Resolved current color (option override or palette default). */
  currentColor: string;
  canRemove: boolean;
  hasImage: boolean;
  isCorrect: boolean;
  /** Which edge of the anchor the menu aligns to (default "start"). */
  align?: MenuAlign;
  onToggleCorrect: () => void;
  onPickColor: (color: string) => void;
  onCustomColor: () => void;
  onUploadImage: () => void;
  onClearImage: () => void;
  onRemove: () => void;
}

const OptionMenu = ({
  displayIndex,
  currentColor,
  canRemove,
  hasImage,
  isCorrect,
  align = "start",
  onToggleCorrect,
  onPickColor,
  onCustomColor,
  onUploadImage,
  onClearImage,
  onRemove,
}: OptionMenuProps) => {
  const palette = buildOptionPalette();
  const wrapRef = useRef<HTMLDivElement>(null);
  const { flipUp, flipEnd } = useFlipToFit(wrapRef);

  return (
    <div
      ref={wrapRef}
      className={[
        styles.menuWrap,
        (align === "end" || flipEnd) && styles.alignEnd,
        flipUp && styles.dropUp,
      ]
        .filter(Boolean)
        .join(" ")}
      onClick={(event) => {
        event.stopPropagation();
      }}>
      <Popover
        role='dialog'
        ariaLabel={`Option ${displayIndex} menu`}
        className={styles.menu}>
        <button
          type='button'
          className={styles.menuItem}
          aria-pressed={isCorrect}
          onClick={onToggleCorrect}>
          <CheckIcon className={styles.menuItemIcon} aria-hidden='true' />
          {isCorrect ? "Mark as wrong" : "Mark as correct"}
        </button>

        <div className={styles.menuDivider} aria-hidden='true' />

        <span className={styles.sectionLabel}>Color</span>
        <div className={styles.swatchStrip} role='group' aria-label='Option color'>
          {palette.map((paletteColor, paletteIndex) => (
            <button
              key={paletteColor}
              type='button'
              className={styles.chip}
              style={{ backgroundColor: paletteColor }}
              aria-label={`Palette color ${(paletteIndex + 1).toString()}`}
              aria-pressed={paletteColor === currentColor}
              onClick={() => {
                onPickColor(paletteColor);
              }}
            />
          ))}
          <button
            type='button'
            className={[styles.chip, styles.chipPlus].join(" ")}
            aria-label='Custom color'
            onClick={onCustomColor}>
            <PlusIcon className={styles.chipPlusIcon} aria-hidden='true' />
          </button>
        </div>

        <div className={styles.menuDivider} aria-hidden='true' />

        <button
          type='button'
          className={[styles.menuItem, styles.menuItemBrand].join(" ")}
          onClick={onUploadImage}>
          <PhotoIcon className={styles.menuItemIcon} aria-hidden='true' />
          Upload an image
        </button>
        {hasImage && (
          <button type='button' className={styles.menuItem} onClick={onClearImage}>
            <XMarkIcon className={styles.menuItemIcon} aria-hidden='true' />
            Remove image
          </button>
        )}
        <button
          type='button'
          className={[styles.menuItem, styles.menuItemDanger].join(" ")}
          disabled={!canRemove}
          onClick={onRemove}>
          <TrashIcon className={styles.menuItemIcon} aria-hidden='true' />
          Delete
        </button>
      </Popover>
    </div>
  );
};

export { OptionMenu };
