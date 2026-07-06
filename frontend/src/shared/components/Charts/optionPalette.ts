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
    (offset) => `oklch(0.65 0.18 ${((OPTION_BASE_HUE + offset) % 360).toString()})`,
  );

/** The datum's own colour, or the palette default for its position. */
export const resolveDatumColor = (datumColor: string | undefined, index: number): string => {
  const palette = buildOptionPalette();
  const paletteIndex = (index >= 0 ? index : 0) % MAX_OPTION_COLORS;
  return datumColor ?? palette[paletteIndex] ?? palette[0];
};
