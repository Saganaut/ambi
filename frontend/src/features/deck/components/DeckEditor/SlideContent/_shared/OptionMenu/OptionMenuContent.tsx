// The per-option dropdown's body — purely presentational, no positioning.
// Contents follow the option-menu design: the controller-supplied primary
// action (MCQ's correct-answer toggle, Axis's set/clear-target toggle), then a
// "Color" section with the shared option palette plus a dashed "+" chip that
// hands off to the custom color picker, then upload / clear-image / delete
// actions. Positioning is the host's job: the legacy `OptionMenu` wraps this in
// an absolute anchor + `useFlipToFit`, while the `FloatingPopover`-based hosts
// render it straight into the floating surface.
import { PhotoIcon, TrashIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { PlusIcon } from "@heroicons/react/24/solid";

import { buildOptionPalette } from "@/shared/components/Charts/optionPalette";
import { Popover } from "@components/Forms/Input/Popover/Popover";
import styles from "./OptionMenu.module.css";
import type { OptionMenuPrimaryAction } from "./OptionMenu.types";

interface OptionMenuContentProps {
  /** Display identifier used for the accessible menu label. */
  displayIndex: string;
  /** Resolved current color (option override or palette default). */
  currentColor: string;
  canRemove: boolean;
  hasImage: boolean;
  /** Leading kind-specific action; omitted for kinds with no toggle (Ranking). */
  primaryAction?: OptionMenuPrimaryAction;
  onPickColor: (color: string) => void;
  onCustomColor: () => void;
  onUploadImage: () => void;
  onClearImage: () => void;
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

  return (
    <Popover role="dialog" ariaLabel={`Option ${displayIndex} menu`} className={styles.menu}>
      {primaryAction && (
        <>
          <button
            type="button"
            className={styles.menuItem}
            aria-pressed={primaryAction.pressed}
            onClick={primaryAction.onSelect}
          >
            <primaryAction.icon className={styles.menuItemIcon} aria-hidden="true" />
            {primaryAction.label}
          </button>

          <div className={styles.menuDivider} aria-hidden="true" />
        </>
      )}

      <span className={styles.sectionLabel}>Color</span>
      <div className={styles.swatchStrip} role="group" aria-label="Option color">
        {palette.map((paletteColor, paletteIndex) => (
          <button
            key={paletteColor}
            type="button"
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
          type="button"
          className={[styles.chip, styles.chipPlus].join(" ")}
          aria-label="Custom color"
          onClick={onCustomColor}
        >
          <PlusIcon className={styles.chipPlusIcon} aria-hidden="true" />
        </button>
      </div>

      <div className={styles.menuDivider} aria-hidden="true" />

      <button
        type="button"
        className={[styles.menuItem, styles.menuItemBrand].join(" ")}
        onClick={onUploadImage}
      >
        <PhotoIcon className={styles.menuItemIcon} aria-hidden="true" />
        Upload an image
      </button>
      {hasImage && (
        <button type="button" className={styles.menuItem} onClick={onClearImage}>
          <XMarkIcon className={styles.menuItemIcon} aria-hidden="true" />
          Remove image
        </button>
      )}
      <button
        type="button"
        className={[styles.menuItem, styles.menuItemDanger].join(" ")}
        disabled={!canRemove}
        onClick={onRemove}
      >
        <TrashIcon className={styles.menuItemIcon} aria-hidden="true" />
        Delete
      </button>
    </Popover>
  );
};

export { OptionMenuContent };
