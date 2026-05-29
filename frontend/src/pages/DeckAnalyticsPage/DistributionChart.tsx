/**
 * Per-element distribution view for the deck-analytics accordion.
 *
 * Translates an {@link ElementStats} record into the row shape consumed by
 * {@link DistributionList} (Common/Analytics primitive) and picks the right
 * empty-state copy when the element kind doesn't bucket its responses
 * (Drawing → review in host replay, Q&A → lives on the session record).
 *
 * The kind-aware empty messages stay here rather than in the primitive so
 * DistributionList itself can stay generic across dashboards.
 */
import { useMemo } from "react";

import { DistributionList } from "@/components/Common/Analytics";
import type { ElementStats } from "@/store/AmbiApi";

import {
  buildDistributionRows,
  isNoDistribution,
  type DeckElement,
} from "./helpers";

interface DistributionChartProps {
  elementId: string;
  element: DeckElement | undefined;
  stats: ElementStats;
}

const DistributionChart = ({
  elementId,
  element,
  stats,
}: DistributionChartProps) => {
  const kind = element?.kind;
  const rows = useMemo(
    () => buildDistributionRows(element, stats),
    [element, stats],
  );

  if (isNoDistribution(kind)) {
    return (
      <DistributionList
        rows={[]}
        emptyMessage={
          kind === "DrawingQuestion"
            ? "Drawings aren't bucketed — review them in the host replay instead."
            : "Audience Q&A submissions live on the session record, not the rollup."
        }
      />
    );
  }

  return (
    <DistributionList
      rows={rows}
      emptyMessage={`No responses recorded for ${elementId.slice(0, 8)}…`}
    />
  );
};

export { DistributionChart };
