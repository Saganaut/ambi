// Default per-option colour palette for MCQ options. The palette itself lives
// with the chart renderers (`Charts/optionPalette.ts`) so an option's fallback
// colour is identical in the option card, the inline chart-label editor, and
// every chart visualisation; authors override per-option via the colour swatch
// (`option.color`).
export {
  buildOptionPalette,
  MAX_OPTION_COLORS,
  resolveDatumColor as resolveOptionColor,
} from "@/shared/components/Charts/optionPalette";
