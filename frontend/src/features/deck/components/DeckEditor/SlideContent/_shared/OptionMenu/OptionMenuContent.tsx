// The per-option dropdown's body — purely presentational
// Uses wrapper with floating ui that handles positioning and outside-click boundary. The legacy inline shell
import { PhotoIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";

import { buildOptionPalette } from "@/shared/components/Charts/optionPalette";
import { Popover } from "@/shared/components/Popover/Popover";
import styles from "./OptionMenu.module.css";
import type { OptionMenuPrimaryAction } from "./OptionMenu.types";

interface OptionMenuContentProps {
  displayIndex: string;
  /** The item's resolved color; omit (with the color handlers) to hide the
   *  Color section, for a kind whose items carry no color. */
  currentColor?: string;
  canRemove: boolean;
  /** Whether the item has an image; omit (with the image handlers) to hide the
   *  image controls, for a kind whose items carry no image. */
  hasImage?: boolean;
  /** Leading kind-specific action; omitted for kinds with no toggle  */
  primaryAction?: OptionMenuPrimaryAction;
  /** Omit (together with `onCustomColor` / `currentColor`) to hide the Color section. */
  onPickColor?: (color: string) => void;
  onCustomColor?: () => void;
  /** Omit to hide the image controls (upload + remove). */
  onUploadImage?: () => void;
  onClearImage?: () => void;
  onRemove: () => void;
}

const OptionMenuContent = ({
  displayIndex,
  currentColor,
  canRemove,
  hasImage,
  primaryAction,
  onPickColor,
  onCustomColor,
  onUploadImage,
  onClearImage,
  onRemove,
}: OptionMenuContentProps) => {
  const palette = buildOptionPalette();
  // Sections are opt-in: a kind whose items carry no color (or no image) simply
  // leaves the matching props off and the menu narrows to what it can act on.
  const showColor =
    currentColor !== undefined && onPickColor !== undefined && onCustomColor !== undefined;
  const showImage = onUploadImage !== undefined;

  return (
    <Popover role="dialog" ariaLabel={`Option ${displayIndex} menu`} className={styles.menu}>
      {primaryAction && (
        <>
          <Popover.Button
            className={styles.menuItem}
            aria-pressed={primaryAction.pressed}
            onClick={primaryAction.onSelect}
          >
            <primaryAction.icon className={styles.menuItemIcon} aria-hidden="true" />
            {primaryAction.label}
          </Popover.Button>

          <div className={styles.menuDivider} aria-hidden="true" />
        </>
      )}

      {showColor && (
        <>
          <span className={styles.sectionLabel}>Color</span>
          <div className={styles.swatchStrip} role="group" aria-label="Option color">
            {palette.map((paletteColor, paletteIndex) => (
              <Popover.Button
                key={paletteColor}
                className={styles.chip}
                style={{ backgroundColor: paletteColor }}
                aria-label={`Palette color ${(paletteIndex + 1).toString()}`}
                aria-pressed={paletteColor === currentColor}
                onClick={() => {
                  onPickColor(paletteColor);
                }}
              />
            ))}
            <Popover.Button
              className={[styles.chip, styles.chipPlus].join(" ")}
              aria-label="Custom color"
              onClick={onCustomColor}
            >
              <PlusIcon className={styles.chipPlusIcon} aria-hidden="true" />
            </Popover.Button>
          </div>
        </>
      )}

      {(showColor || showImage) && <div className={styles.menuDivider} aria-hidden="true" />}

      {showImage && (
        <>
          <Popover.Button
            className={[styles.menuItem, styles.menuItemBrand].join(" ")}
            onClick={onUploadImage}
          >
            <PhotoIcon className={styles.menuItemIcon} aria-hidden="true" />
            Upload an image
          </Popover.Button>
          {hasImage === true && onClearImage && (
            <Popover.Button className={styles.menuItem} onClick={onClearImage}>
              <XMarkIcon className={styles.menuItemIcon} aria-hidden="true" />
              Remove image
            </Popover.Button>
          )}
        </>
      )}
      <Popover.Button
        className={[styles.menuItem, styles.menuItemDanger].join(" ")}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <TrashIcon className={styles.menuItemIcon} aria-hidden="true" />
        Delete
      </Popover.Button>
    </Popover>
  );
};

export { OptionMenuContent };
