/**
 * Per-segment KPI compositions for the deck-analytics dashboard.
 *
 * The segment control above the strip swaps between three views — "All"
 * (deck-wide totals across formats), "Games" (the scored sessions), and
 * "Presentations" (typically unscored). Each view picks its own field set
 * and its own labels so the dashboard doesn't show misleading "Avg score:
 * 0" lines for presentation-heavy decks, or hide accuracy on a deck that
 * never collected scored answers.
 *
 * The actual KPI tiles + grid come from Common/Analytics; this file only
 * decides which tiles to render and what values to pass in.
 */
import {
  CalendarDaysIcon,
  ClockIcon,
  PresentationChartLineIcon,
  TrophyIcon,
  UserGroupIcon,
  UsersIcon,
} from "@heroicons/react/24/outline";

import { Kpi, KpiStrip as KpiStripLayout } from "@/components/Common/Analytics";
import type {
  DeckAnalytics,
  FormatRollup,
} from "@/store/BrainFlexApi";
import { formatDuration, formatPercent, formatRelativeDate } from "./helpers";
import type { Segment } from "./helpers";

interface KpiStripProps {
  analytics: DeckAnalytics | undefined;
  segment: Segment;
  deckHasScoredAnswers: boolean;
}

const KpiStrip = ({ analytics, segment, deckHasScoredAnswers }: KpiStripProps) => {
  if (segment === "GAMES") {
    return <GameKpis rollup={analytics?.gameRollup} />;
  }
  if (segment === "PRESENTATIONS") {
    return (
      <PresentationKpis
        rollup={analytics?.presentationRollup}
        showAccuracy={deckHasScoredAnswers}
      />
    );
  }
  return <AllKpis analytics={analytics} />;
};

const AllKpis = ({ analytics }: { analytics: DeckAnalytics | undefined }) => {
  const totalSessions = analytics?.totalPlays ?? 0;
  const totalParticipants = analytics?.totalPlayers ?? 0;
  const avgScore = analytics?.averageScore ?? 0;
  const avgAccuracy = analytics?.averageAccuracy ?? 0;
  const avgDurationMs = analytics?.averageDurationMs ?? 0;
  const lastRunAt = analytics?.lastPlayedAt;
  const gameCount = analytics?.gameRollup?.sessionCount ?? 0;
  return (
    <KpiStripLayout>
      <Kpi
        label='Total sessions'
        value={totalSessions.toLocaleString()}
        icon={<PresentationChartLineIcon />}
      />
      <Kpi
        label='Participants'
        value={totalParticipants.toLocaleString()}
        sub='counts each finish, not distinct people'
        icon={<UsersIcon />}
      />
      {gameCount > 0 && (
        <Kpi
          label='Avg score'
          value={avgScore.toFixed(1)}
          sub='games only'
          icon={<TrophyIcon />}
        />
      )}
      <Kpi label='Avg accuracy' value={formatPercent(avgAccuracy)} />
      <Kpi
        label='Avg duration'
        value={formatDuration(avgDurationMs)}
        icon={<ClockIcon />}
      />
      <Kpi
        label='Last run'
        value={lastRunAt ? formatRelativeDate(lastRunAt) : "—"}
        icon={<CalendarDaysIcon />}
      />
    </KpiStripLayout>
  );
};

const GameKpis = ({ rollup }: { rollup: FormatRollup | undefined }) => {
  const sessions = rollup?.sessionCount ?? 0;
  const players = rollup?.participantCount ?? 0;
  const avgScore = rollup?.averageScore ?? 0;
  const avgAccuracy = rollup?.averageAccuracy ?? 0;
  const avgDurationMs = rollup?.averageDurationMs ?? 0;
  const lastRunAt = rollup?.lastRunAt;
  return (
    <KpiStripLayout>
      <Kpi
        label='Games played'
        value={sessions.toLocaleString()}
        icon={<TrophyIcon />}
      />
      <Kpi
        label='Players'
        value={players.toLocaleString()}
        icon={<UserGroupIcon />}
      />
      <Kpi label='Avg score' value={avgScore.toFixed(1)} />
      <Kpi label='Avg accuracy' value={formatPercent(avgAccuracy)} />
      <Kpi
        label='Avg game length'
        value={formatDuration(avgDurationMs)}
        icon={<ClockIcon />}
      />
      <Kpi
        label='Last played'
        value={lastRunAt ? formatRelativeDate(lastRunAt) : "—"}
        icon={<CalendarDaysIcon />}
      />
    </KpiStripLayout>
  );
};

const PresentationKpis = ({
  rollup,
  showAccuracy,
}: {
  rollup: FormatRollup | undefined;
  showAccuracy: boolean;
}) => {
  const sessions = rollup?.sessionCount ?? 0;
  const participants = rollup?.participantCount ?? 0;
  const avgAccuracy = rollup?.averageAccuracy ?? 0;
  const avgDurationMs = rollup?.averageDurationMs ?? 0;
  const lastRunAt = rollup?.lastRunAt;
  return (
    <KpiStripLayout>
      <Kpi
        label='Presentations delivered'
        value={sessions.toLocaleString()}
        icon={<PresentationChartLineIcon />}
      />
      <Kpi
        label='Participants'
        value={participants.toLocaleString()}
        icon={<UsersIcon />}
      />
      {showAccuracy && (
        <Kpi
          label='Avg accuracy'
          value={formatPercent(avgAccuracy)}
          sub='scored elements only'
        />
      )}
      <Kpi
        label='Avg presentation length'
        value={formatDuration(avgDurationMs)}
        icon={<ClockIcon />}
      />
      <Kpi
        label='Last delivered'
        value={lastRunAt ? formatRelativeDate(lastRunAt) : "—"}
        icon={<CalendarDaysIcon />}
      />
    </KpiStripLayout>
  );
};

export { KpiStrip };
