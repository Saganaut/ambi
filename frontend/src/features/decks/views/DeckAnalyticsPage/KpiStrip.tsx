/**
 * Per-segment KPI compositions for the deck-analytics dashboard.
 *
 * TODO(migration): stubbed pending analytics rebuild — this component was
 * built around the Kpi + KpiStrip primitives from @ui/Analytics, which are
 * gone. Renders a placeholder until analytics is rebuilt.
 */
import type { DeckAnalytics } from "@store/AmbiApi";
import type { Segment } from "./helpers";

interface KpiStripProps {
  analytics: DeckAnalytics | undefined;
  segment: Segment;
  deckHasScoredAnswers: boolean;
}

const KpiStrip = (_props: KpiStripProps) => {
  return <div>Analytics — coming soon</div>;
};

export { KpiStrip };
