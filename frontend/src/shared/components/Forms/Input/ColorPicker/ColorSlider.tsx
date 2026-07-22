// 1D slider track shared by the hue and alpha rows of the custom color view.
// Hue runs 0-360 over a fixed rainbow track; alpha runs 0-100 over a
// transparent→current-color ramp. Drag with the pointer, or focus and use
// ←/→ (Shift steps by 10× the base step), Home/End for the extremes.
import { hsvaToHex, hueToPureHex, type Hsva } from "./colorConversion";
import { usePointerDrag } from "./usePointerDrag";
import styles from "./ColorPicker.module.css";

interface ColorSliderProps {
  kind: "hue" | "alpha";
  hsva: Hsva;
  /** New hue in degrees (0-360) or alpha percentage (0-100), per `kind`. */
  onChange: (value: number) => void;
}

const ColorSlider = ({ kind, hsva, onChange }: ColorSliderProps) => {
  const max = kind === "hue" ? 360 : 100;
  const value = kind === "hue" ? hsva.h : hsva.a * 100;

  const dragHandlers = usePointerDrag((x) => {
    onChange(x * max);
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    let next = value;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") next -= step;
    else if (event.key === "ArrowRight" || event.key === "ArrowUp") next += step;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = max;
    else return;
    event.preventDefault();
    onChange(Math.min(max, Math.max(0, next)));
  };

  // The alpha track ramps to the current color at full opacity.
  const trackStyle =
    kind === "alpha"
      ? ({
          "--picker-alpha-tint": hsvaToHex({ ...hsva, a: 1 }),
        } as React.CSSProperties)
      : undefined;

  return (
    <div
      role='slider'
      aria-label={kind === "hue" ? "Hue" : "Opacity"}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={[styles.sliderTrack, kind === "hue" ? styles.hueTrack : styles.alphaTrack].join(" ")}
      style={trackStyle}
      onKeyDown={handleKeyDown}
      {...dragHandlers}>
      <span
        className={styles.sliderHandle}
        style={{
          left: `${((value / max) * 100).toString()}%`,
          background: kind === "hue" ? hueToPureHex(hsva.h) : undefined,
        }}
        aria-hidden='true'
      />
    </div>
  );
};

export { ColorSlider };
