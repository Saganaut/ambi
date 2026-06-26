import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { McqOption } from "@/shared/types/elements";
import type { ReactNode } from "react";
import { AnswerSettings } from "../../../features/deck/store/deckApi.gen";

// We want to make sure this is usable by liveSession results + deck editor results

export interface ChartDatum extends McqOption {
  id: string;
  value: number;
  highlight?: boolean;
  isCorrect?: boolean;
}

export interface ChartProps {
  chartMode: "editable" | "scorable";
  // Normalised chart data, computed once by the parent (editor preview or live
  // session tally) and passed down. Charts are presentational and never reach
  // into the editor for their data — that inversion is what lets the same
  // component render an author preview and a live-results board.
  data: ChartDatum[];
  /** Print each value's share of the total as a percentage. */
  displayAsPercentage: boolean;
  caption?: string;
  animateOnMount?: boolean;
  /**
   * When on, the chart's values randomise to a fresh 0–10 each every 5s — a
   * preview of how it animates as live results stream in. Driven centrally by
   * `useAnimatedChartData` in `ResultsDisplaySwitch`; renderers just re-render
   * off the new `data`.
   */
  continuousAnimation?: boolean;
  /** Pie/Donut only — full-radius pie vs. ring. Defaults to "pie". */
  variant?: "pie" | "donut";
  /** Bar only — bar growth direction. Defaults to "horizontal". */
  orientation?: "horizontal" | "vertical";
  /** Dot/Bar — denominator for the share %; defaults to the sum of values. */
  // total?: number;
  // Editable mode renders these per option. They're separate so each chart can
  // place them independently in its layout (e.g. label in the legend, menu
  // floating, drag handle by the value).
  /** The option's editable text field. */
  renderLabel?: (datum: ChartDatum) => ReactNode;
  /** The correct/incorrect toggle. */
  renderToggle?: (datum: ChartDatum) => ReactNode;
  /** The option's menu (image/colour/remove). */
  renderMenu?: (datum: ChartDatum) => ReactNode;
  /** A drag handle that makes the option sortable for reorder. */
  // handleOptionDragEnd?: (event: DragEndEvent) => void;
  // addOption?: () => void;
  // canAddOption?: boolean;
  editor?: UseMcqEditorResult;
  answerSettings?: AnswerSettings;
}

export interface EditableChartProps extends ChartProps {
  chartMode: "editable";
  renderLabel: (datum: ChartDatum) => ReactNode;
  renderToggle: (datum: ChartDatum) => ReactNode;
  renderMenu: (datum: ChartDatum) => ReactNode;
  // handleOptionDragEnd: (event: DragEndEvent) => void;
  // addOption: () => void;
  // canAddOption: boolean;
  editor: UseMcqEditorResult;
  answerSettings?: AnswerSettings;
}

export interface ScorableChartProps extends ChartProps {
  chartMode: "scorable";
}

export type GeneralChartProps = EditableChartProps | ScorableChartProps;

export type ChartType =
  | "PIE"
  | "DONUT"
  | "BAR_HORIZONTAL"
  | "BAR_VERTICAL"
  | "LINE"
  | "PARETO"
  | "DOT"
  | "NONE";
