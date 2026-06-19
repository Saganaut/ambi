// Shared datum + chart-kind vocabulary consumed by every renderer in /Charts
// and by the ResultsChart dispatcher. A question type's results adapter
// normalises its own payload (MCQ option counts, ranking points, …) into
// `ChartDatum[]`, so the same aggregated data can fan out to any renderer
// without per-chart adapters at the call site.
import type { ReactNode } from "react";

export interface ChartDatum {
  /** Stable identity of the source datum (e.g. the MCQ option id). Lets a
   *  renderLabel callback map an edited label back to its option; absent for
   *  read-only data that doesn't need it. */
  id?: string;
  label: string;
  value: number;
  /** Mark this datum (e.g. the correct MCQ option) for emphasis. */
  highlight?: boolean;
  /** Explicit slice/bar colour (e.g. an MCQ option's colour). Renderers fall
   *  back to their tone palette when absent. */
  color?: string;
  imageUrl?: string;
  isCorrect?: boolean;
}

// The props every renderer shares. Each chart's own props interface extends
// this and adds only its specifics (orientation, variant, …); the ResultsChart
// dispatcher extends it too and forwards everything down. `renderLabel` is how
// the deck editor injects an editable label in place of the plain text span —
// read-only callers (e.g. the live session board) omit it and get static text.
export interface ChartProps {
  data: ChartDatum[];
  caption?: string;
  /** Render a custom node for a datum's label (editor inline-edit). When
   *  omitted, renderers show `datum.label` as plain text. */
  displayAsPercentage?: boolean;
  renderLabel?: (datum: ChartDatum) => ReactNode;
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
