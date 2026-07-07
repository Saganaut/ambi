// Marker/badge color for an Axis item row. Reuses the shared option palette
// (the single source of truth with MCQ — `Charts/optionPalette.ts`), but Axis
// allows up to 12 items (`MAX_AXIS_ITEMS`) while the palette holds 6, so a
// plain modulo would hand rows 7–12 the exact color of rows 1–6. The second
// cycle re-derives each hue at a darker lightness (CSS relative color, the
// same `oklch(from …)` syntax tokens.css builds its scales with) so every row
// keeps a distinguishable marker.
import {
  buildOptionPalette,
  MAX_OPTION_COLORS,
} from "@/shared/components/Charts/optionPalette";

/** Lightness for the palette's second cycle (first cycle is 0.65). */
const SECOND_CYCLE_LIGHTNESS = 0.42;

const axisItemColor = (index: number): string => {
  const palette = buildOptionPalette();
  const base = palette[index % MAX_OPTION_COLORS] ?? palette[0];
  if (index < MAX_OPTION_COLORS) return base;
  return `oklch(from ${base} ${SECOND_CYCLE_LIGHTNESS.toString()} c h)`;
};

export { axisItemColor };
