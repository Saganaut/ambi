// Presentation metadata for the results-visualisation chart types: the label and
// icon shown for each `ChartType` in the authoring pickers. Shared so every chart
// picker (the sidebar `McqResultsSection` and the on-canvas `ChartTypePicker`)
// renders the same option set from one source instead of each keeping its own copy.
import type { ChartType } from "./Chart.types";

import BarHorizontalIcon from "@assets/icons/charts/bar-horizontal.svg?react";
import BarVerticalIcon from "@assets/icons/charts/bar-vertical.svg?react";
import DonutIcon from "@assets/icons/charts/donut.svg?react";
import DotIcon from "@assets/icons/charts/dot.svg?react";
import LineIcon from "@assets/icons/charts/line.svg?react";
import NoneIcon from "@assets/icons/charts/none.svg?react";
import ParetoIcon from "@assets/icons/charts/pareto.svg?react";
import PieIcon from "@assets/icons/charts/pie.svg?react";

type VizIcon = typeof BarHorizontalIcon;

const VIZ_META: Record<ChartType, { label: string; Icon: VizIcon }> = {
  BAR_HORIZONTAL: { label: "Bars", Icon: BarHorizontalIcon },
  BAR_VERTICAL: { label: "Columns", Icon: BarVerticalIcon },
  PIE: { label: "Pie", Icon: PieIcon },
  DONUT: { label: "Donut", Icon: DonutIcon },
  LINE: { label: "Line", Icon: LineIcon },
  PARETO: { label: "Pareto", Icon: ParetoIcon },
  DOT: { label: "Dots", Icon: DotIcon },
  NONE: { label: "None", Icon: NoneIcon },
};

export { VIZ_META };
export type { VizIcon };
