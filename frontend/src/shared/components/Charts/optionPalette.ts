// Default per-datum colour palette for chart renderers. Six swatches spaced
// evenly around the colour wheel — constant lightness/chroma keeps them
// visually balanced. This is the single source of truth for option colours:
// the deck editor's option cards (`optionColor.ts`) delegate here so a datum
// falls back to the same colour in every chart and in the card grid alike.
const OPTION_BASE_HUE = 290;
const OPTION_HUE_OFFSETS = [0, 60, 120, 180, 240, 300] as const;

export const MAX_OPTION_COLORS = OPTION_HUE_OFFSETS.length;

export const buildOptionPalette = (): string[] =>
  OPTION_HUE_OFFSETS.map(
    (offset) => `oklch(0.65 0.40 ${((OPTION_BASE_HUE + offset) % 360).toString()})`,
  );

/** Lightness for the palette's second cycle (first cycle is 0.65). */
const SECOND_CYCLE_LIGHTNESS = 0.42;

/**
 * Palette colour for a 0-based position, cycling past `MAX_OPTION_COLORS`.
 * The first cycle (indices 0–5) is the six swatches as-is; a plain modulo
 * would then hand rows 7–12 the exact colours of rows 1–6, so the second
 * cycle re-derives each hue at a darker lightness (CSS relative colour, the
 * same `oklch(from …)` syntax tokens.css builds its scales with) to keep
 * every row distinguishable. The cycle then alternates back to the original
 * lightness for indices 12–17, darker again for 18–23, and so on.
 */
export const paletteColorAt = (index: number): string => {
  const safeIndex = index >= 0 ? index : 0;
  const palette = buildOptionPalette();
  const base = palette[safeIndex % MAX_OPTION_COLORS] ?? palette[0];
  const isDarkerCycle = Math.floor(safeIndex / MAX_OPTION_COLORS) % 2 === 1;
  return isDarkerCycle ? `oklch(from ${base} ${SECOND_CYCLE_LIGHTNESS.toString()} c h)` : base;
};

/** The datum's own colour, or the palette default for its position. */
export const resolveDatumColor = (datumColor: string | undefined, index: number): string =>
  datumColor ?? paletteColorAt(index);
