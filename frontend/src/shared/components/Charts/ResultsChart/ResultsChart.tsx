// The one place that maps a `ChartType` to a concrete renderer. Both the deck
// editor's results preview and the live session board render through this, so a
// new visualisation is wired in exactly once. Callers hand it already-normalised
// `ChartDatum[]` (produced by a question type's results adapter) plus the chosen
// `viz`; "NONE" renders nothing. Keeping the switch here — rather than at each
// call site — is what lets the same aggregated data fan out to any chart.
import type { ChartProps, ChartType } from "../types";
import { BarChart } from "../BarChart/BarChart";
import { PieChart } from "../PieChart/PieChart";
import { LineChart } from "../LineChart/LineChart";
import { ParetoChart } from "../ParetoChart/ParetoChart";
import { DotPlot } from "../DotPlot/DotPlot";

export interface ResultsChartProps extends ChartProps {
  viz: ChartType;
  /** Pie/donut entrance animation; ignored by other renderers. */
  animateOnMount?: boolean;
}

const ResultsChart = ({
  viz,
  data,
  caption,
  animateOnMount,
  renderLabel,
}: ResultsChartProps) => {
  switch (viz) {
    case "PIE":
      return (
        <PieChart
          variant='pie'
          data={data}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
        />
      );
    case "DONUT":
      return (
        <PieChart
          variant='donut'
          data={data}
          caption={caption}
          animateOnMount={animateOnMount}
          renderLabel={renderLabel}
        />
      );
    case "BAR_HORIZONTAL":
      return (
        <BarChart
          orientation='horizontal'
          data={data}
          caption={caption}
          renderLabel={renderLabel}
        />
      );
    case "BAR_VERTICAL":
      return (
        <BarChart
          orientation='vertical'
          data={data}
          caption={caption}
          renderLabel={renderLabel}
        />
      );
    case "LINE":
      return <LineChart data={data} caption={caption} renderLabel={renderLabel} />;
    case "PARETO":
      return <ParetoChart data={data} caption={caption} renderLabel={renderLabel} />;
    case "DOT":
      return <DotPlot data={data} caption={caption} renderLabel={renderLabel} />;
    case "NONE":
      return null;
  }
};

export { ResultsChart };
