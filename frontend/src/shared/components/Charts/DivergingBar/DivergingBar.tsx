// Likert diverging stacked bar — agree/disagree fanned from a centre baseline,
// one row per SCALES statement. Placeholder stub for now; see PlaceholderChart.
import type { ChartProps } from "../Chart.types";
import { PlaceholderChart } from "../PlaceholderChart/PlaceholderChart";

export type DivergingBarProps = ChartProps;

const DivergingBar = (props: DivergingBarProps) => (
  <PlaceholderChart label="Likert diverging bar" {...props} />
);

export { DivergingBar };
