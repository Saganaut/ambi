// Default per-option colour palette for MCQ options. Six swatches spaced evenly
// around the colour wheel — starting defaults independent of the app/deck theme;
// authors override per-option via the colour swatch (`option.color`). Constant
// lightness/chroma keeps them visually balanced. Shared by the option card
// (`McqOptionEditable`) and the inline chart-label editor so both fall back to
// the same colour for a given option position.
const OPTION_BASE_HUE = 290;
const OPTION_HUE_OFFSETS = [0, 60, 120, 180, 240, 300] as const;

export const MAX_OPTION_COLORS = OPTION_HUE_OFFSETS.length;

export const buildOptionPalette = (): string[] =>
  OPTION_HUE_OFFSETS.map(
    (offset) =>
      `oklch(0.65 0.18 ${((OPTION_BASE_HUE + offset) % 360).toString()})`,
  );

/** The option's own colour, or the palette default for its position. */
export const resolveOptionColor = (
  optionColor: string | undefined,
  index: number,
): string => {
  const palette = buildOptionPalette();
  const paletteIndex = (index >= 0 ? index : 0) % MAX_OPTION_COLORS;
  return optionColor ?? palette[paletteIndex] ?? palette[0];
};
