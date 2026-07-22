// The 2D saturation/value field of the custom color view: white→hue across,
// transparent→black down. Drag with the pointer, or focus and use the arrow
// keys (←/→ saturation, ↑/↓ value; Shift steps by 10).
import { hueToPureHex, type Hsva } from "./colorConversion";
import { usePointerDrag } from "./usePointerDrag";
import styles from "./ColorPicker.module.css";

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

interface SaturationFieldProps {
  hsva: Hsva;
  onChange: (saturation: number, value: number) => void;
}

const SaturationField = ({ hsva, onChange }: SaturationFieldProps) => {
  const dragHandlers = usePointerDrag((x, y) => {
    onChange(x * 100, (1 - y) * 100);
  });

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 1;
    let { s, v } = hsva;
    if (event.key === "ArrowLeft") s -= step;
    else if (event.key === "ArrowRight") s += step;
    else if (event.key === "ArrowUp") v += step;
    else if (event.key === "ArrowDown") v -= step;
    else return;
    event.preventDefault();
    onChange(clampPercent(s), clampPercent(v));
  };

  return (
    <div
      role='slider'
      aria-label='Saturation and brightness'
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(hsva.s)}
      aria-valuetext={`Saturation ${Math.round(hsva.s).toString()}%, brightness ${Math.round(hsva.v).toString()}%`}
      tabIndex={0}
      className={styles.saturationField}
      style={{ "--picker-hue": hueToPureHex(hsva.h) } as React.CSSProperties}
      onKeyDown={handleKeyDown}
      {...dragHandlers}>
      <span
        className={styles.fieldHandle}
        style={{ left: `${hsva.s.toString()}%`, top: `${(100 - hsva.v).toString()}%` }}
        aria-hidden='true'
      />
    </div>
  );
};

export { SaturationField };
