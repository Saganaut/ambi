// Per-question-type results config — the map from a slide's content type to the
// visualisations that type supports (drives the editor's viz picker) plus, for
// fully-wired types, its adapter + sample-data generator. Adding or extending a
// question type is a single entry here; the renderers and the ResultsChart
// dispatcher only need the corresponding `ChartType` handled.
//
// Keyed by content-type *string* (not the `SlideType` enum) on purpose: this
// module lives in `shared/` and must not import from `features/deck`.
import { mcqSampleDistribution, mcqToChartData } from "./adapters/mcq";
import type { ChartType } from "./Chart.types";

export interface ResultsConfig {
  /** Visualisations offered for this question type, in picker order. */
  supportedViz: ChartType[];
  /**
   * Whether this type's results are fully wired (real adapter + charts). When
   * false, `supportedViz` may include placeholder charts that render a
   * "coming soon" tile until implemented.
   */
  implemented: boolean;
  /** Present only for fully-wired types (MCQ today). */
  toChartData?: typeof mcqToChartData;
  sampleDistribution?: typeof mcqSampleDistribution;
}

// MCQ supports every visualisation the dispatcher knows for categorical votes
// (its `McqDataVisualization` enum is exactly this set), with NONE last as the
// "no chart" choice. The only type whose adapter is registered here — the
// placement kinds and SCALES sample their own shape instead (see
// `adapters/placement.ts` and `adapters/scales.ts`).
export const mcqResults: ResultsConfig = {
  supportedViz: [
    "BAR_HORIZONTAL",
    "BAR_VERTICAL",
    "PIE",
    "DONUT",
    "LINE",
    "PARETO",
    "DOT",
    "POOL_RIBBON",
    "NONE",
  ],
  implemented: true,
  toChartData: mcqToChartData,
  sampleDistribution: mcqSampleDistribution,
};

// The map. Keyed by `SlideContent.contentType`. Every response-producing type is
// registered so `getSupportedViz` can answer "which charts fit this question?";
// entries still marked `implemented: false` map placeholder viz until their
// editor sections are wired, and `getPickableViz` withholds those. Display-only types
// (TITLE, CONTENT, MEDIA, INSTRUCTION) and DRAWING have no results chart yet and
// are intentionally absent — `getSupportedViz` returns [] for them.
export const resultsRegistry: Record<string, ResultsConfig> = {
  MCQ: mcqResults,
  NUMBER: { supportedViz: ["HISTOGRAM", "DOT", "NONE"], implemented: false },
  TEXT: { supportedViz: ["WORD_CLOUD", "BAR_HORIZONTAL", "NONE"], implemented: false },
  FOLLOW_UP: { supportedViz: ["WORD_CLOUD", "NONE"], implemented: false },
  Q_AND_A: { supportedViz: ["WORD_CLOUD", "NONE"], implemented: false },
  SCALES: { supportedViz: ["DIVERGING_BAR", "NONE"], implemented: true },
  RANKING: { supportedViz: ["BAR_HORIZONTAL", "BAR_VERTICAL", "NONE"], implemented: false },
  ALLOCATION: { supportedViz: ["BAR_HORIZONTAL", "BAR_VERTICAL", "NONE"], implemented: false },
  GRID: { supportedViz: ["HEATMAP", "NONE"], implemented: false },
  AXIS: { supportedViz: ["HEATMAP", "NONE"], implemented: true },
  MATCHING: { supportedViz: ["HEATMAP", "NONE"], implemented: false },
  PLACE_ON_IMAGE: { supportedViz: ["HEATMAP", "NONE"], implemented: true },
};

/**
 * The valid chart types for a question type, in picker order. Returns [] for a
 * content type with no results visualisation (display-only or not-yet-mapped).
 * The entry point an editor's results section calls to build its viz picker.
 */
export const getSupportedViz = (contentType: string): ChartType[] =>
  resultsRegistry[contentType]?.supportedViz ?? [];

/**
 * The chart types an author may actually pick for a question type: its
 * `supportedViz` once the type's results are wired end-to-end, and [] while
 * they are still placeholders — so a picker never offers a "coming soon" tile.
 */
export const getPickableViz = (contentType: string): ChartType[] =>
  resultsRegistry[contentType]?.implemented === true ? getSupportedViz(contentType) : [];
