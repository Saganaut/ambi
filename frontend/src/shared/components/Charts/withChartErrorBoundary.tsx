// Shared HOC applied at each chart's export (BarChart / PieChart / LineChart /
// ParetoChart): these are hand-rolled SVG charts computing scales and
// percentages off live, possibly malformed data, so a throw is plausible.
// Wrapping here means every call site is protected with no consumer changes.
import type { ComponentType } from "react";
import { ErrorFallback } from "@ui/BoundaryFallbacks/ErrorFallback";
import { ErrorBoundary } from "@ui/ErrorBoundary/ErrorBoundary";

// This file exports a HOC factory rather than a component, so Fast Refresh
// can't apply here — same tradeoff as any other .tsx utility that returns JSX.
const withChartErrorBoundary = <P extends object>(
  name: string,
  Chart: ComponentType<P>,
): ComponentType<P> => {
  // eslint-disable-next-line react-refresh/only-export-components
  const ChartWithErrorBoundary = (props: P) => (
    <ErrorBoundary
      boundaryName={`chart-${name}`}
      fallback={<ErrorFallback message="Something went wrong rendering this chart." />}
    >
      <Chart {...props} />
    </ErrorBoundary>
  );
  ChartWithErrorBoundary.displayName = `ChartWithErrorBoundary(${name})`;
  return ChartWithErrorBoundary;
};

export { withChartErrorBoundary };
