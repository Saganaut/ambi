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
  optionType: "TEXT" | "NUMBER" | "IMAGE";
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
  /** Append a new option — drives the hover-revealed "+" affordance. */
  addOption?: () => void;
  /** True while another option may be added (under the option cap). */
  canAddOption?: boolean;
  /** The option's editable text field. */
  renderLabel?: (datum: ChartDatum) => ReactNode;
  /** The correct/incorrect toggle. */
  renderToggle?: (datum: ChartDatum) => ReactNode;
  /**
   * The option's menu (image/colour/remove). Charts whose menu anchor sits
   * near the canvas' right edge (a narrow column, an absolutely-positioned
   * label) pass `menuAlign: "end"` so the popover opens leftward instead of
   * clipping past the edge.
   */
  renderMenu?: (datum: ChartDatum, menuAlign?: MenuAlign) => ReactNode;
  /** Called when the user drags an option to a new position. */
  onReorder?: (event: DragEndEvent) => void;
}

/** Which edge of its anchor the option-menu popover aligns to. */
export type MenuAlign = "start" | "end";

export type ChartType =
  | "PIE"
  | "DONUT"
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "LINE"
  | "PARETO"
  | "DOT"
  | "HISTOGRAM"
  // Mapped for other question types but not yet built — rendered by
  // PlaceholderChart until implemented. See registry.ts / ResultsDisplaySwitch.
  | "WORD_CLOUD"
  | "HEATMAP"
  | "DIVERGING_BAR"
  | "IMAGE_OVERLAY"
  | "NONE";

export interface ChartSegmentRenderProps {
  datum: ChartDatum;
  sortIndex: number;
  displayAsPercentage: boolean;
  denominator: number;
  highestValue?: number;
  isCorrect?: boolean;
  canAddOption?: boolean;
  addOption?: () => void;
  renderLabel?: (datum: ChartDatum) => ReactNode;
  renderToggle?: (datum: ChartDatum) => ReactNode;
  renderMenu?: (datum: ChartDatum, menuAlign?: MenuAlign) => ReactNode;
  onReorder?: (event: DragEndEvent) => void;
}
