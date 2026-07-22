import type { CSSProperties } from "react";

import styles from "./HeroDotGrid.module.css";

// Decorative 9×9 palette grid echoing the brand identity sheet: each row draws
// from one palette family, shades ramp across the row, and a diagonal color
// wave sweeps the grid (per-dot animation delays keyed to row + column).
const GRID_SIZE = 9;

type Hue = "violet" | "grey" | "orange" | "cyan";

const ROW_HUES: readonly Hue[] = [
  "violet",
  "grey",
  "orange",
  "violet",
  "cyan",
  "grey",
  "violet",
  "orange",
  "cyan",
];

const SHADE_RAMP = [400, 500, 600, 500, 300, 400, 500, 600, 400] as const;

const WAVE_STEP_MS = 90;

const DOTS = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => {
  const row = Math.floor(i / GRID_SIZE);
  const col = i % GRID_SIZE;
  const shade = SHADE_RAMP[(row * 2 + col) % SHADE_RAMP.length];
  return {
    key: `${row}-${col}`,
    color: `var(--${ROW_HUES[row]}-${shade})`,
    delay: `${(row + col) * WAVE_STEP_MS}ms`,
  };
});

const HeroDotGrid = () => (
  <div className={styles.grid} aria-hidden='true'>
    {DOTS.map((dot) => (
      <span
        key={dot.key}
        className={styles.dot}
        style={
          {
            "--dot-color": dot.color,
            "--dot-delay": dot.delay,
          } as CSSProperties
        }
      />
    ))}
  </div>
);

export { HeroDotGrid };
