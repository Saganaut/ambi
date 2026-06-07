// Hardcoded fallbacks for the answer/point settings forms.
//
// The effective value shown for a slide is resolved in three layers, last wins:
//   1. these hardcoded defaults  (so number inputs always have a defined value)
//   2. the deck-wide default     (deck.settings.{answer,point}Settings)
//   3. the per-slide override    (slide.settings.{answer,point}Settings)
//
// They live here, separate from the form components, so the forthcoming deck
// settings panel can resolve against the same baseline without importing UI.
import type { AnswerSettings, PointSettings } from "@store/AmbiApi";

const ANSWER_SETTINGS_DEFAULTS: Required<
  Omit<AnswerSettings, never>
> = {
  displayResultsLive: false,
  allowMultipleAnswers: false,
  shuffleOptions: false,
  anonymizeAnswers: false,
  countdownTime: 15,
  allowAnonymous: false,
  maxSelections: 1,
};

const POINT_SETTINGS_DEFAULTS: Required<
  Omit<PointSettings, "streakBonuses">
> = {
  points: 100,
  deceptionPoints: 0,
  bestAnswerPoints: 0,
  fastestCorrectAnswerPoints: 0,
  resetStreakOnStreakEnd: false,
};

/** Deep-resolve the effective answer settings: defaults ← deck ← slide. */
const resolveAnswerSettings = (
  deck: AnswerSettings | undefined,
  slide: AnswerSettings | undefined,
): AnswerSettings => ({
  ...ANSWER_SETTINGS_DEFAULTS,
  ...deck,
  ...slide,
});

/** Deep-resolve the effective point settings: defaults ← deck ← slide. */
const resolvePointSettings = (
  deck: PointSettings | undefined,
  slide: PointSettings | undefined,
): PointSettings => ({
  ...POINT_SETTINGS_DEFAULTS,
  ...deck,
  ...slide,
});

export {
  ANSWER_SETTINGS_DEFAULTS,
  POINT_SETTINGS_DEFAULTS,
  resolveAnswerSettings,
  resolvePointSettings,
};
