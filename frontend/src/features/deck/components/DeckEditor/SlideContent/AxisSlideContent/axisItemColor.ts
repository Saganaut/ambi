// Marker/badge color for an Axis item row. Reuses the shared option palette
// (the single source of truth with MCQ — `Charts/optionPalette.ts`). Axis caps
// at `MAX_AXIS_ITEMS` (6), matching the palette's 6 colors, so every row gets a
// distinct hue on the first cycle. Should that cap ever rise past the palette
// size, a plain modulo would hand the overflow rows the exact colors of rows
// 1–6, so the second cycle re-derives each hue at a darker lightness (CSS
// relative color, the same `oklch(from …)` syntax tokens.css builds its scales
// with) to keep every marker distinguishable.
import { buildOptionPalette, MAX_OPTION_COLORS } from "@/shared/components/Charts/optionPalette";

/** Lightness for the palette's second cycle (first cycle is 0.65). */
const SECOND_CYCLE_LIGHTNESS = 0.42;

const axisItemColor = (index: number): string => {
  const palette = buildOptionPalette();
  const base = palette[index % MAX_OPTION_COLORS] ?? palette[0];
  if (index < MAX_OPTION_COLORS) return base;
  return `oklch(from ${base} ${SECOND_CYCLE_LIGHTNESS.toString()} c h)`;
};

/** The item's authored color override when set, else its palette default. */
const resolveAxisItemColor = (color: string | undefined, index: number): string =>
  color ?? axisItemColor(index);

export { axisItemColor, resolveAxisItemColor };
