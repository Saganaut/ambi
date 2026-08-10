import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { ChartType } from "@/shared/components/Charts/Chart.types";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { DefaultResultsDisplay } from "./DefaultResultsDisplay";
import { McqSlideContentViewProps } from "./McqSlideContentView";

export interface RenderMcqResultsDisplayOptions extends Omit<
  McqSlideContentViewProps,
  "previewVisualization"
> {
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;
  openMenuId: string | null;
  openPicker: OpenGalleryPicker;
  visualization: ChartType | null;
  editor: UseMcqEditorResult;
  mockPreviewDistribution: Record<string, number>;
}

export const renderMcqResultsDisplay = (chartProps: RenderMcqResultsDisplayOptions): ReactNode => {
  switch (chartProps.visualization) {
    case null:
      return <DefaultResultsDisplay {...chartProps} />;
    case "NONE":
      return <DefaultResultsDisplay {...chartProps} />;

    case "PIE":
      return <PieChart {...chartProps} variant="pie" />;

    case "DONUT":
      return <PieChart {...chartProps} variant="donut" />;

    case "BAR_HORIZONTAL":
      return <BarChart {...chartProps} orientation="horizontal" />;

    case "BAR_VERTICAL":
      return <BarChart {...chartProps} orientation="vertical" />;

    case "LINE":
      return <LineChart {...chartProps} />;

    case "PARETO":
      return <ParetoChart {...chartProps} />;

    case "DOT":
      return <DotPlot {...chartProps} />;

    case "HISTOGRAM":
      return <div>Not implemented</div>;
    // return <Histogram {...chartProps} />;

    case "WORD_CLOUD":
      return <div>Not implemented</div>;

    // return <WordCloud {...chartProps} />;

    case "HEATMAP":
      return <div>Not implemented</div>;

    // return <Heatmap {...chartProps} />;

    case "DIVERGING_BAR":
      return <div>Not implemented</div>;

    // return <DivergingBar {...chartProps} />;

    case "IMAGE_OVERLAY":
      return <div>Not implemented</div>;

    // return <ImageOverlay {...chartProps} />;
    default: {
      const _exhaustiveCheck: never = chartProps.visualization;
      throw new Error(`Unhandled visualization type: ${_exhaustiveCheck}`);
    }
  }
};
