// One round color swatch. Renders whatever CSS color string it's given —
// hex, oklch(), or a live var(--role-*) theme reference (which the cascade
// resolves in place, so theme swatches repaint with the active theme). The
// pick callback hands back the button element too, so the panel can read the
// *resolved* color off the DOM when it needs a concrete value to edit.
import type { ColorValue } from "./colorConversion";
import styles from "./ColorPicker.module.css";

interface SwatchBtnProps {
  color: ColorValue;
  label: string;
  selected?: boolean;
  /** sm = 22px row swatch (Recent/Theme rows), md = 36px grid swatch. */
  size?: "sm" | "md";
  onPick: (color: ColorValue, element: HTMLButtonElement) => void;
  onHover?: (color: ColorValue) => void;
}

const SwatchBtn = ({
  color,
  label,
  selected = false,
  size = "md",
  onPick,
  onHover,
}: SwatchBtnProps) => (
  <button
    type='button'
    title={label}
    aria-label={`Set color ${label}`}
    aria-pressed={selected}
    className={[
      styles.swatch,
      size === "sm" && styles.swatchSm,
      selected && styles.swatchSelected,
    ]
      .filter(Boolean)
      .join(" ")}
    style={{ "--picker-swatch": color } as React.CSSProperties}
    onClick={(event) => {
      onPick(color, event.currentTarget);
    }}
    onPointerEnter={onHover ? () => { onHover(color); } : undefined}
  />
);

export { SwatchBtn };
