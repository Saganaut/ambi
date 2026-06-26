/**
 *  Consolidates props and handles the switch depending on which visualization
 * to display.
 *  **/

import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { AnswerSettings } from "@/features/deck/store/deckApi.gen";
import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { ChartDatum, type ChartType } from "@/shared/components/Charts/types";
import { useAnimatedChartData } from "@/shared/components/Charts/useAnimatedChartData";
import { ReactNode } from "react";
import { DefaultResultsDisplay } from "../McqSlideContent/DefaultResultsDisplay";

export interface ResultsDisplaySwitchProps {
  viz: ChartType;
  caption: string;
  animateOnMount?: boolean;
  /** When on, values randomise (0–10) every 5s — a live-results preview. */
  continuousAnimation?: boolean;
  renderLabel: (datum: ChartDatum) => ReactNode;
  renderToggle: (datum: ChartDatum) => ReactNode;
  renderMenu: (datum: ChartDatum) => ReactNode;
  chartMode: "editable" | "scorable";
  editor: UseMcqEditorResult;
  answerSettings?: AnswerSettings;
}

const ResultsDisplaySwitch = ({
  viz,
  caption,
  animateOnMount = true,
  continuousAnimation = false,
  renderLabel,
  renderToggle,
  renderMenu,
  chartMode,
  editor,
  answerSettings,
}: ResultsDisplaySwitchProps) => {
  // Called before the early returns below to keep hook order stable; it handles
  // an undefined question itself.
  const { data } = useAnimatedChartData(editor.question, continuousAnimation);

  if (chartMode != "editable") throw Error("Expected editable chart in switch");

  const { question } = editor;
  if (question == null) return <p> no question</p>;

  const sharedProps = {
    chartMode: "editable" as const,
    caption,
    animateOnMount,
    continuousAnimation,
    data,
    displayAsPercentage: answerSettings?.displayResultsAsPercentage ?? false,
    renderLabel,
    renderToggle,
    renderMenu,
    editor,
    answerSettings,
  };

  switch (viz) {
    case "NONE":
      return <DefaultResultsDisplay {...sharedProps} />;
    case "PIE":
      return <PieChart variant="pie" {...sharedProps} />;
    case "DONUT":
      return <PieChart variant="donut" {...sharedProps} />;
    case "BAR_HORIZONTAL":
      return <BarChart orientation="horizontal" {...sharedProps} />;
    case "BAR_VERTICAL":
      return <BarChart orientation="vertical" {...sharedProps} />;
    case "LINE":
      return <LineChart {...sharedProps} />;
    case "PARETO":
      return <ParetoChart {...sharedProps} />;
    case "DOT":
      return <DotPlot {...sharedProps} />;
    default: {
      const _exhaustive: never = viz;
      return _exhaustive;
    }
  }
};

export { ResultsDisplaySwitch };
