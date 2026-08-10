import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { ChartType } from "@/shared/components/Charts/Chart.types";
import { DivergingBar } from "@/shared/components/Charts/DivergingBar/DivergingBar";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { Heatmap } from "@/shared/components/Charts/Heatmap/Heatmap";
import { Histogram } from "@/shared/components/Charts/Histogram/Histogram";
import { ImageOverlay } from "@/shared/components/Charts/ImageOverlay/ImageOverlay";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { WordCloud } from "@/shared/components/Charts/WordCloud/WordCloud";
import { OpenGalleryPicker } from "@/shared/hooks/useGalleryPicker";
import { Dispatch, ReactNode, SetStateAction } from "react";
import { DefaultResultsDisplay } from "./DefaultResultsDisplay";
import { McqSlideContentViewProps } from "./McqSlideContentView";

export interface RenderMcqResultsDisplayOptions
  extends Omit<McqSlideContentViewProps, "previewVisualization"> {
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
      return <Histogram {...chartProps} />;

    case "WORD_CLOUD":
      return <WordCloud {...chartProps} />;

    case "HEATMAP":
      return <Heatmap {...chartProps} />;

    case "DIVERGING_BAR":
      return <DivergingBar {...chartProps} />;

    case "IMAGE_OVERLAY":
      return <ImageOverlay {...chartProps} />;
  }
};
