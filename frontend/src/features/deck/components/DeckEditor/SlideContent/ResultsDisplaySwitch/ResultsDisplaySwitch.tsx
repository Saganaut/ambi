/**
 *  Consolidates props and handles the switch depending on which visualization
 * to display.
 *  **/

import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { AnswerSettings } from "@/features/deck/store/deckApi.gen";
import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { DivergingBar } from "@/shared/components/Charts/DivergingBar/DivergingBar";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { Heatmap } from "@/shared/components/Charts/Heatmap/Heatmap";
import { Histogram } from "@/shared/components/Charts/Histogram/Histogram";
import { ImageOverlay } from "@/shared/components/Charts/ImageOverlay/ImageOverlay";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { WordCloud } from "@/shared/components/Charts/WordCloud/WordCloud";
import { ChartDatum, type ChartType } from "@/shared/components/Charts/Chart.types";
import { useAnimatedChartData } from "@/shared/components/Charts/useAnimatedChartData";
import { ReactNode } from "react";
import { DefaultResultsDisplay } from "../McqSlideContent/DefaultResultsDisplay";

export interface ResultsDisplaySwitchProps {
  viz: ChartType;
  caption: string;
  animateOnMount?: boolean;
  /** When on, values randomise (0–10) every 3s — a live-results preview. */
  continuousAnimation?: boolean;
  renderLabel: (datum: ChartDatum) => ReactNode;
  renderToggle: (datum: ChartDatum) => ReactNode;
  renderMenu: (datum: ChartDatum) => ReactNode;
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
  editor,
  answerSettings,
}: ResultsDisplaySwitchProps) => {
  // Called before the early returns below to keep hook order stable; it handles
  // an undefined question itself.
  const { data } = useAnimatedChartData(editor.question, continuousAnimation);

  const { question } = editor;
  if (question == null) return <p> no question</p>;

  const sharedProps = {
    caption,
    animateOnMount,
    continuousAnimation,
    data,
    displayAsPercentage: answerSettings?.displayResultsAsPercentage ?? false,
    renderLabel,
    renderToggle,
    renderMenu,
    onReorder: editor.handleOptionDragEnd,
    addOption: editor.addOption,
    canAddOption: editor.canAddOption,
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
    case "HISTOGRAM":
      return <Histogram {...sharedProps} />;
    // Mapped but not yet built — render a "coming soon" placeholder.
    case "WORD_CLOUD":
      return <WordCloud {...sharedProps} />;
    case "HEATMAP":
      return <Heatmap {...sharedProps} />;
    case "DIVERGING_BAR":
      return <DivergingBar {...sharedProps} />;
    case "IMAGE_OVERLAY":
      return <ImageOverlay {...sharedProps} />;
    default: {
      const _exhaustive: never = viz;
      return _exhaustive;
    }
  }
};

export { ResultsDisplaySwitch };
