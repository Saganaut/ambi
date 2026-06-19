// Shared datum + chart-kind vocabulary consumed by every renderer in /Charts
// and by the ResultsChart dispatcher. A question type's results adapter
// normalises its own payload (MCQ option counts, ranking points, …) into
// `ChartDatum[]`, so the same aggregated data can fan out to any renderer
// without per-chart adapters at the call site.
export interface ChartDatum {
  label: string;
  value: number;
  /** Mark this datum (e.g. the correct MCQ option) for emphasis. */
  highlight?: boolean;
  /** Explicit slice/bar colour (e.g. an MCQ option's colour). Renderers fall
   *  back to their tone palette when absent. */
  color?: string;
}

// The visualisation kinds the dispatcher knows how to render. Deliberately a
// standalone vocabulary (not imported from any feature's enum) so both the deck
// editor and live session depend on Charts, never the reverse. MCQ's
// `McqDataVisualization` is a structural subset of these literals.
export type ChartType =
  | "PIE"
  | "DONUT"
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "LINE"
  | "PARETO"
  | "DOT"
  | "NONE";
