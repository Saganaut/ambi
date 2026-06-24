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
  // Data now comes from the editor which has access to the question and processed within the component
  // data: ChartDatum[];
  caption?: string;
  displayAsPercentage?: boolean;
  animateOnMount?: boolean;
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
