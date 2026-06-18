// Full hex color picker backed by @uiw/react-color-block. The sibling
// {@link ColorPicker} is hue-only (the theme system stores a 0–360 angle); this
// one surfaces the block's hex input + swatches and reports the chosen color as
// a plain `#RRGGBB` string. Used for slide / deck background color, which stores
// an arbitrary hex value rather than a themed hue. Stateless: the caller owns the
// value and the change/clear handlers.
import Block from "@uiw/react-color-block";
import type { ColorResult } from "@uiw/color-convert";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { IconBtn } from "@ui/Buttons/IconBtn";
import { BACKGROUND_COLOR_CHOICES } from "@utils/color";
import styles from "./ColorPicker.module.css";

// Shown when nothing has resolved yet, so the picker has a defined starting hue.
const FALLBACK_HEX = "#ffffff";

interface BackgroundColorPickerProps {
  label: string;
  /** The current color (own or inherited); falls back to white when unset. */
  value?: string;
  /** Fires with the picked `#RRGGBB` hex on every selection / hex edit. */
  onChange: (hex: string) => void;
  /** When provided, renders a clear ("reset to deck") affordance in the header. */
  onClear?: () => void;
}

const BackgroundColorPicker = ({
  label,
  value,
  onChange,
  onClear,
}: BackgroundColorPickerProps) => (
  <div className={styles.container}>
    <div className={styles.header}>
      <span className={styles.label}>{label}</span>
      {onClear && (
        <IconBtn
          fill="ghost"
          size="xs"
          icon={<XMarkIcon />}
          aria-label={`Clear ${label.toLowerCase()}`}
          onClick={onClear}
        />
      )}
    </div>
    <Block
      className={styles.block}
      color={value ?? FALLBACK_HEX}
      colors={[...BACKGROUND_COLOR_CHOICES]}
      onChange={(color: ColorResult) => {
        onChange(color.hex);
      }}
    />
  </div>
);

export { BackgroundColorPicker };
export type { BackgroundColorPickerProps };
