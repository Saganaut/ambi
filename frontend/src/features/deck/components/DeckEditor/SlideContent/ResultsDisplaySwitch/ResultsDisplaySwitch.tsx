/**
 *  Consolidates props and handles the switch depending on which visualization
 * to display.  
 *  **/

import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { EditableChartProps, type ChartType } from "@/shared/components/Charts/types";
import { DefaultResultsDisplay } from "../McqSlideContent/DefaultResultsDisplay";

export interface ResultsChartProps extends EditableChartProps {
  viz: ChartType;
}

const ResultsDisplaySwitch = ({
  viz,
  caption,
  animateOnMount,
  renderLabel,
  renderToggle,
  renderMenu,
  chartMode,
  editor,
  answerSettings,
}: ResultsChartProps) => {
  if (chartMode != "editable") throw Error("Expected editable chart in switch");

  const sharedProps = {
    chartMode: "editable" as const,
    caption,
    animateOnMount,
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
