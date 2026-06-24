// Per-question-type results config, keyed by the slide/content type string.
// Each entry declares which visualisations that type supports (drives the
// editor's viz picker) alongside its adapter + sample-data generator. Adding a
// new question type is a single entry here — the renderers and the ResultsChart
// dispatcher don't change. MCQ is the only entry today.
import { mcqSampleDistribution, mcqToChartData, type McqOptionLike } from "./adapters/mcq";
import type { ChartType } from "./types";

export interface McqResultsConfig {
  supportedViz: ChartType[];
  toChartData: typeof mcqToChartData;
  sampleDistribution: typeof mcqSampleDistribution;
}

// MCQ supports every visualisation the dispatcher knows (its
// `McqDataVisualization` enum is the full ChartType set), with NONE last as the
// "no chart" choice.
export const mcqResults: McqResultsConfig = {
  supportedViz: ["BAR_HORIZONTAL", "BAR_VERTICAL", "PIE", "DONUT", "LINE", "PARETO", "DOT", "NONE"],
  toChartData: mcqToChartData,
  sampleDistribution: mcqSampleDistribution,
};

// Lookup by content/slide type. Future types (NUMBER, RANKING, …) register here.
export const resultsRegistry = {
  MCQ: mcqResults,
} as const;

export type { McqOptionLike };

