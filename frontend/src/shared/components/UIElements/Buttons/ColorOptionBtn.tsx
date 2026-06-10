// Color swatch button. Renders a small square filled with the given color so
// users can pick from a palette (e.g. the RichTextInput text-color row). An
// empty `color` renders a transparent swatch — useful as a "default / clear"
// option. `preventFocusSteal` mirrors PopoverButton: when true, mousedown is
// suppressed so clicking the swatch doesn't blur whatever editor surface the
// toolbar floats above.
import styles from "./Buttons.module.css";

interface ColorOptionBtnProps {
  label: string;
  color: string;
  onClick: () => void;
  preventFocusSteal?: boolean;
}

const ColorOptionBtn = ({
  label,
  color,
  onClick,
  preventFocusSteal = false,
}: ColorOptionBtnProps) => {
  return (
    <button
      type='button'
      title={label}
      aria-label={`Set color ${label}`}
      className={styles.colorOptionBtn}
      style={{ background: color || "transparent" }}
      onMouseDown={
        preventFocusSteal
          ? (e) => {
              e.preventDefault();
            }
          : undefined
      }
      onClick={onClick}
    />
  );
};

export { ColorOptionBtn };
