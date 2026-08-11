import { UseMcqEditorResult } from "@/features/deck/hooks/useMcqEditor";
import { McqDataVisualization } from "@/features/deck/store/deckEnums.gen";
import { BarChart } from "@/shared/components/Charts/BarChart/BarChart";
import { DotPlot } from "@/shared/components/Charts/DotPlot/DotPlot";
import { LineChart } from "@/shared/components/Charts/LineChart/LineChart";
import { ParetoChart } from "@/shared/components/Charts/ParetoChart/ParetoChart";
import { PieChart } from "@/shared/components/Charts/PieChart/PieChart";
import { PoolRibbon } from "@/shared/components/Charts/PoolRibbon/PoolRibbon";
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
  /** MCQ commits one of its own enum's values, so the dispatcher below handles
   * exactly that set — a `ChartType` outside it is narrowed away upstream. */
  visualization: McqDataVisualization | null;
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

    case "POOL_RIBBON":
      return <PoolRibbon {...chartProps} />;

    default: {
      const _exhaustiveCheck: never = chartProps.visualization;
      throw new Error(`Unhandled visualization type: ${_exhaustiveCheck}`);
    }
  }
};
