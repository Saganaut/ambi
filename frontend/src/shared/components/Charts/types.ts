import type { DragEndEvent } from "@dnd-kit/react";
import type { ReactNode } from "react";

export interface ChartDatum {
  id: string;
  value: number;
  text?: string;
  color?: string;
  /** Resolved image URL — computed by the app adapter before passing in. */
  imageUrl?: string;
  imageAlt?: string;
  highlight?: boolean;
  isCorrect?: boolean;
}

export interface ChartProps {
  data: ChartDatum[];
  /** Print each value's share of the total as a percentage. */
  displayAsPercentage: boolean;
  caption?: string;
  animateOnMount?: boolean;
  /**
   * When on, the chart's values randomise to a fresh 0–10 each every 3s — a
   * preview of how it animates as live results stream in. Driven centrally by
   * `useAnimatedChartData` in `ResultsDisplaySwitch`; renderers just re-render
   * off the new `data`.
   */
  continuousAnimation?: boolean;
  /** Pie/Donut only — full-radius pie vs. ring. Defaults to "pie". */
  variant?: "pie" | "donut";
  /** Bar only — bar growth direction. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** The option's editable text field. */
  renderLabel?: (datum: ChartDatum) => ReactNode;
  /** The correct/incorrect toggle. */
  renderToggle?: (datum: ChartDatum) => ReactNode;
  /** The option's menu (image/colour/remove). */
  renderMenu?: (datum: ChartDatum) => ReactNode;
  /** Called when the user drags an option to a new position. */
  onReorder?: (event: DragEndEvent) => void;
}

export type ChartType =
  | "PIE"
  | "DONUT"
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "LINE"
  | "PARETO"
  | "DOT"
  | "NONE";
