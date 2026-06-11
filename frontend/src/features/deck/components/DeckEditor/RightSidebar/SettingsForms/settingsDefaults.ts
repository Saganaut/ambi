// Hardcoded fallbacks for the answer/point settings forms.
//
// The effective value shown for a slide is resolved in three layers, last wins:
//   1. these hardcoded defaults  (so number inputs always have a defined value)
//   2. the deck-wide default     (deck.settings.{answer,point}Settings)
//   3. the per-slide override    (slide.settings.{answer,point}Settings)
//
// They live here, separate from the form components, so the forthcoming deck
// settings panel can resolve against the same baseline without importing UI.
import type { AnswerSettings, PointSettings } from "@deck/store/deckApi.gen";
import { ResultsDisplayMode } from "@deck/store/deckEnums.gen";

const ANSWER_SETTINGS_DEFAULTS: Required<
  Omit<AnswerSettings, never>
> = {
  displayResultsMode: ResultsDisplayMode.ROUND_END,
  displayResultsAsPercentage: false,
  shuffleOptions: false,
  anonymizeAnswers: false,
  countdownTime: 15,
  allowAnonymous: false,
  maxSelections: 1,
};

// When players see the answer breakdown. Ordered roughly by how early results
// appear during a session. Shared by the slide-override and deck-default forms.
const RESULTS_DISPLAY_MODE_OPTIONS: {
  value: ResultsDisplayMode;
  label: string;
}[] = [
  { value: ResultsDisplayMode.IMMEDIATE, label: "Live / immediate" },
  { value: ResultsDisplayMode.ROUND_END, label: "At round end" },
  { value: ResultsDisplayMode.PRESENTATION_END, label: "At presentation end" },
  { value: ResultsDisplayMode.AFTER_FOLLOWUP, label: "After follow-up" },
  { value: ResultsDisplayMode.MANUAL, label: "Manual reveal" },
  { value: ResultsDisplayMode.NEVER, label: "Never" },
];

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
  RESULTS_DISPLAY_MODE_OPTIONS,
  resolveAnswerSettings,
  resolvePointSettings,
};
