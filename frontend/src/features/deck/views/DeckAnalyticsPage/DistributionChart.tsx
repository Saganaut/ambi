/**
 * Per-element distribution view for the deck-analytics accordion.
 *
 * TODO(migration): stubbed pending analytics rebuild — this component was
 * built around the DistributionList primitive from @ui/Analytics, which is
 * gone. Renders a placeholder until analytics is rebuilt.
 */
import type { ElementStats } from "@store/AmbiApi";

import type { DeckElement } from "./helpers";

interface DistributionChartProps {
  elementId: string;
  element: DeckElement | undefined;
  stats: ElementStats;
}

const DistributionChart = (_props: DistributionChartProps) => {
  return <div>Analytics — coming soon</div>;
};

export { DistributionChart };
