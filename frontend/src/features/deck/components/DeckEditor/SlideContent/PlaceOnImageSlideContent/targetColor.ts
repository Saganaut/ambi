// Marker/badge color for a Place-on-Image target. Same sourcing as Axis's
// `axisItemColor`: the shared option palette (single source of truth with MCQ,
// `Charts/optionPalette.ts`). Targets cap at `MAX_PLACE_TARGETS` (6), matching
// the palette's 6 colors, so every marker gets a distinct default hue; an
// authored override (set via the row menu) wins over the palette.
import { buildOptionPalette, MAX_OPTION_COLORS } from "@/shared/components/Charts/optionPalette";

const targetColor = (index: number): string => {
  const palette = buildOptionPalette();
  return palette[index % MAX_OPTION_COLORS] ?? palette[0];
};

/** The target's authored color override when set, else its palette default. */
const resolveTargetColor = (color: string | undefined, index: number): string =>
  color ?? targetColor(index);

export { resolveTargetColor, targetColor };
