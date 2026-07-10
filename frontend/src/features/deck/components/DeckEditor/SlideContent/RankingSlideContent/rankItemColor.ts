// Index-badge color for a Ranking item row. Reuses the shared option palette
// (the single source of truth with MCQ/Axis — `Charts/optionPalette.ts`).
// Ranking caps at `MAX_RANKING_ITEMS` (8), two past the palette's 6 colors, so
// rows 7–8 would collide with rows 1–2 under a plain modulo; the second cycle
// re-derives each hue at a darker lightness (CSS relative color, the same
// `oklch(from …)` syntax tokens.css builds its scales with) to keep every
// badge distinguishable. Mirrors `axisItemColor`.
import { buildOptionPalette, MAX_OPTION_COLORS } from "@/shared/components/Charts/optionPalette";

/** Lightness for the palette's second cycle (first cycle is 0.65). */
const SECOND_CYCLE_LIGHTNESS = 0.42;

const rankItemColor = (index: number): string => {
  const palette = buildOptionPalette();
  const base = palette[index % MAX_OPTION_COLORS] ?? palette[0];
  if (index < MAX_OPTION_COLORS) return base;
  return `oklch(from ${base} ${SECOND_CYCLE_LIGHTNESS.toString()} c h)`;
};

/** The item's authored color override when set, else its palette default. */
const resolveRankItemColor = (color: string | undefined, index: number): string =>
  color ?? rankItemColor(index);

export { rankItemColor, resolveRankItemColor };
