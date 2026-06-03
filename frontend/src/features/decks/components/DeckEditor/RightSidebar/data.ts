// Per-element-kind relevance map for the EditSlidePanel's audience/display
// controls. Today every shared option lives in SlideOptionsSection and only
// renders for `Slide` elements — chunk 21 surfaces the same chrome for every
// kind, so the section needs to know *which* controls actually mean anything
// for the currently-selected element. Consumers render a disabled control
// (greyed-out) for `false` flags so the layout stays stable instead of
// shifting when the user clicks between kinds.
//
// Two granularities live here:
//   - top-level `OptionRelevance` flags: whether the whole control surfaces.
//   - `resultsCharts`: the subset of the chart picker's icon buttons that
//     apply. An MCQ supports BAR + PIE; a TextQuestion only WORD_CLOUD; a
//     PlaceOnImageQuestion ships its own heatmap viz and supports none.
//
// `Slide` is non-interactive by definition, so all of its response-shape
// flags are false. The lobby slide (slideKind=TITLE) is the *only* Slide
// that surfaces QR / join chrome — the consumer narrows that further via
// `relevanceFor(element)` below; the raw map keeps Slide's lobby flags true
// so the chrome is reachable in principle.

import type { DeckResponse } from "@store/AmbiApi";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

export type ElementKind = DeckElement["kind"];

/** Chart types the picker offers. `DEFAULT` (kind's built-in viz) is always
 * implicitly available — selecting none of the four explicit chart types
 * collapses back to it. */
export type ChartType =
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "WORD_CLOUD"
  | "PIE_CHART";

export interface OptionRelevance {
  // --- Results display (chart picker + percentage toggle) ---
  /** Whether the chart-picker row mounts at all. False = the kind has no
   *  per-element results visualization (Slide, Q&A, Drawing, Matching). */
  resultsDisplayType: boolean;
  /** Which of the four chart-picker buttons are enabled for this kind. */
  resultsCharts: ChartType[];
  /** "Show results as %" toggle — only meaningful for kinds whose viz reduces
   *  to a count distribution that can be re-normalized as a percentage. */
  showResultsAsPercentage: boolean;

  // --- Response shape ---
  /** "Allow multiple selections" toggle — gates `selectionsPerParticipant`
   *  inline; only kinds that map naturally to an option-set support it. */
  multipleSelectionsEnabled: boolean;
  /** "Show responses" radio (INSTANT / ON_CLICK / PRIVATE). Belongs to any
   *  interactive kind; Slide / non-scored chrome doesn't show it. */
  showResponses: boolean;

  // --- Pacing ---
  /** "Auto-advance after N seconds" toggle. Universally relevant. */
  autoAdvance: boolean;

  // --- Lobby chrome (lobby Slide only — see `relevanceFor` for slideKind gate) ---
  showQrCode: boolean;
  showJoinInformation: boolean;

  // --- Labels ---
  /** Plain-text heading shown above the question / slide body. */
  heading: boolean;
  /** Rich-text note shown to participants before they answer. */
  participantInformation: boolean;
  /** Small uppercase pre-heading chip ("QUESTION 3 OF 10", "POLL", etc).
   *  Lands cross-cutting in chunk 21 part A.7 — universally relevant. */
  titleLabel: boolean;
}

const ALL_CHARTS: readonly ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "WORD_CLOUD",
  "PIE_CHART",
];

const BAR_AND_PIE: readonly ChartType[] = [
  "BAR_HORIZONTAL",
  "BAR_VERTICAL",
  "PIE_CHART",
];

const BAR_ONLY: readonly ChartType[] = ["BAR_HORIZONTAL", "BAR_VERTICAL"];

export const EDIT_SLIDE_OPTION_RELEVANCE: Record<ElementKind, OptionRelevance> =
  {
    // ---------------------------------------------------------------- Slide
    // Non-interactive content. The lobby (slideKind=TITLE) is the only Slide
    // that actually surfaces QR + join info — `relevanceFor` narrows that.
    Slide: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: false,
      autoAdvance: true,
      showQrCode: true,
      showJoinInformation: true,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- MCQ
    // Counted picks: every chart type applies; percentage + multi-select +
    // response gating all relevant.
    McqQuestion: {
      resultsDisplayType: true,
      resultsCharts: [...ALL_CHARTS],
      showResultsAsPercentage: true,
      multipleSelectionsEnabled: true,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Text
    // Free-text answers — only a word cloud meaningfully visualizes the spread.
    // Percentage doesn't apply (no buckets); multi-select isn't a thing.
    TextQuestion: {
      resultsDisplayType: true,
      resultsCharts: ["WORD_CLOUD"],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Number
    // Continuous answer space — bar charts work (binned), pie/word-cloud don't.
    NumberQuestion: {
      resultsDisplayType: true,
      resultsCharts: [...BAR_ONLY],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Ranking
    // The host UI shows an ordered list — bar/pie of "% who placed X first"
    // makes sense; word cloud doesn't.
    RankingQuestion: {
      resultsDisplayType: true,
      resultsCharts: [...BAR_AND_PIE],
      showResultsAsPercentage: true,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Scales
    // Likert-style — bar chart per statement is the natural viz. Pie + word
    // cloud don't fit a multi-statement layout.
    ScalesQuestion: {
      resultsDisplayType: true,
      resultsCharts: [...BAR_ONLY],
      showResultsAsPercentage: true,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Q&A
    // Audience-driven open Q&A — submissions are curated/voted, no aggregate
    // chart fits. `showResponses` still matters (private until host reveals).
    QAndAQuestion: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Grid
    // Cell-based selection — has its own grid heatmap viz; no chart picker.
    // Multi-select toggles between single-pick and multi-cell answers.
    GridQuestion: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: true,
      multipleSelectionsEnabled: true,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- PlaceOnImage
    // Spatial heatmap reveal — no chart picker. Single-pick by definition.
    PlaceOnImageQuestion: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- WordCloud
    // Always renders as a word cloud — the chart picker is academic but kept
    // available so the author can confirm the intended viz. No multi-select.
    WordCloudQuestion: {
      resultsDisplayType: true,
      resultsCharts: ["WORD_CLOUD"],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Allocation
    // Mentimeter "100 points" — distribution across buckets reads naturally as
    // bar or pie. Percentage applies (allocations are share-of-total).
    AllocationQuestion: {
      resultsDisplayType: true,
      resultsCharts: [...BAR_AND_PIE],
      showResultsAsPercentage: true,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Matching
    // Reveal renders the correct pair list — no aggregate chart fits.
    MatchingQuestion: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },

    // ---------------------------------------------------------------- Drawing
    // Open canvas — reveals as a grid of submitted drawings; no chart picker.
    DrawingQuestion: {
      resultsDisplayType: false,
      resultsCharts: [],
      showResultsAsPercentage: false,
      multipleSelectionsEnabled: false,
      showResponses: true,
      autoAdvance: true,
      showQrCode: false,
      showJoinInformation: false,
      heading: true,
      participantInformation: true,
      titleLabel: true,
    },
  };

/** Narrowed relevance for a concrete element. Layers slideKind on top of the
 * raw per-kind map: only the lobby Slide (slideKind=TITLE) actually surfaces
 * the QR + join-info chrome; every other slideKind suppresses those even
 * though the raw `Slide` row allows them. */
export const relevanceFor = (element: {
  kind: ElementKind;
  slideKind?: string;
}): OptionRelevance => {
  const base = EDIT_SLIDE_OPTION_RELEVANCE[element.kind];
  if (element.kind !== "Slide") return base;
  const isLobby = element.slideKind === "TITLE";
  return {
    ...base,
    showQrCode: isLobby,
    showJoinInformation: isLobby,
  };
};
