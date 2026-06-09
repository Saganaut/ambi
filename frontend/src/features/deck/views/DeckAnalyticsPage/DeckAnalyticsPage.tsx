/**
 * Per-deck analytics dashboard (chunk 16).
 *
 * Reads the rolled-up {@code DeckAnalytics} from the backend and renders a
 * KPI strip plus a per-element accordion. The dashboard switches between
 * three views via a segment control: "All" (deck-wide totals across formats),
 * "Games" (the {@code gameRollup} slice — scored sessions), and
 * "Presentations" (the {@code presentationRollup} slice — typically unscored).
 *
 * This file is intentionally thin — it owns only the page chrome (title,
 * actions, segment control wiring, loading + error states). The KPI strip,
 * per-element accordion, distribution chart, and data plumbing all live in
 * sibling files; reusable analytics primitives (Kpi, KpiStrip, Segment,
 * DistributionList) come from {@code components/Common/Analytics}.
 *
 * The "Export CSV" button bypasses RTK Query (the response is text, not JSON)
 * by opening {@code GET /api/decks/{id}/analytics/csv} in a hidden anchor —
 * the browser then honors the {@code Content-Disposition: attachment} the
 * backend stamps and downloads the file. Cookies travel with the navigation,
 * so the existing session auth is reused without an extra fetch.
 */
import { useMemo, useState } from "react";
import { getRouteApi, Link } from "@tanstack/react-router";
import { ArrowDownTrayIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";

import { Btn } from "@ui/Buttons/Btn";
import { useGetDeckQuery } from "@deck/store/deckApi.gen";
import { useGetDeckAnalyticsQuery } from "@store/AmbiApi";
import type { DeckAnalytics } from "@store/AmbiApi";
import { apiBaseUrl } from "@store/emptyApi";

import { ElementCard } from "./ElementCard";
import { KpiStrip } from "./KpiStrip";
import { buildOrderedElements } from "./helpers";
import type { Segment as SegmentId } from "./helpers";
import styles from "./DeckAnalyticsPage.module.css";

const routeApi = getRouteApi("/decks/$deckId/analytics");

const DeckAnalyticsPage = () => {
  const { deckId } = routeApi.useParams();

  const {
    data: deck,
    isLoading: deckLoading,
    error: deckError,
  } = useGetDeckQuery({ id: deckId });
  const {
    data: analytics,
    isLoading: analyticsLoading,
    error: analyticsError,
  } = useGetDeckAnalyticsQuery({ id: deckId });

  const loading = deckLoading || analyticsLoading;
  const fatalError = deckError ?? analyticsError;

  // The backend now distinguishes these cases (decks use honest 403 vs 404 —
  // see z-docs/features/exceptions.md), so we no longer have to conflate them.
  const errorStatus =
    fatalError && typeof fatalError === "object" && "status" in fatalError
      ? (fatalError as { status?: number | string }).status
      : undefined;
  const fatalErrorMessage =
    errorStatus === 403
      ? "You don't have access to this deck's analytics."
      : errorStatus === 404
        ? "That deck doesn't exist."
        : "We couldn't load this deck's analytics. Please try again.";

  // TODO(migration): segment control removed with @ui/Analytics; pinned to
  // "ALL" pending analytics rebuild.
  const [segment] = useState<SegmentId>("ALL");

  const orderedElements = useMemo(
    () => buildOrderedElements(deck, analytics),
    [deck, analytics],
  );

  // Any element with a non-zero correctCount is enough to call the deck
  // "scored." Drives whether the Presentations segment shows accuracy at all.
  const deckHasScoredAnswers = useMemo(
    () => orderedElements.some((row) => (row.stats.correctCount ?? 0) > 0),
    [orderedElements],
  );

  const handleExportCsv = () => {
    // window.open keeps the existing session cookie attached so the backend
    // sees the same auth as RTK Query would; Content-Disposition on the
    // response makes the browser download it instead of navigating away.
    window.open(
      `${apiBaseUrl}/api/decks/${deckId}/analytics/csv`,
      "_blank",
      "noopener",
    );
  };

  return (
    <div className={styles.page}>
      <header className={styles.pageHeader}>
        <div className={styles.headerLeft}>
          <span className={styles.breadcrumb}>Deck analytics</span>
          <h1 className={styles.title}>{deck?.name ?? "Loading…"}</h1>
          {analytics && <FormatMixChip analytics={analytics} />}
        </div>
        <div className={styles.headerActions}>
          <Link
            to='/decks/$deckId/edit'
            params={{ deckId }}
            search={{ slideId: undefined }}>
            <Btn size='md' shape='pill'>
              <ArrowLeftIcon className={styles.btnIcon} />
              Back to editor
            </Btn>
          </Link>
          <Btn
            size='md'
            shape='pill'
            variant='brand'
            onClick={handleExportCsv}
            disabled={loading}>
            <ArrowDownTrayIcon className={styles.btnIcon} />
            Export CSV
          </Btn>
        </div>
      </header>

      {fatalError ? (
        <div className={styles.errorBanner} role='alert'>
          {fatalErrorMessage}
        </div>
      ) : loading ? (
        <div className={styles.loading}>Loading analytics…</div>
      ) : (
        <>
          <KpiStrip
            analytics={analytics}
            segment={segment}
            deckHasScoredAnswers={deckHasScoredAnswers}
          />
          <h2 className={styles.sectionTitle}>Per-element breakdown</h2>
          {orderedElements.length === 0 ? (
            <div className={styles.empty}>
              No data yet — run a session to start populating analytics.
            </div>
          ) : (
            <div className={styles.elementList}>
              {orderedElements.map((row) => (
                <ElementCard
                  key={row.elementId}
                  elementId={row.elementId}
                  element={row.element}
                  stats={row.stats}
                  segment={segment}
                  deckHasScoredAnswers={deckHasScoredAnswers}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

/**
 * Tiny chip under the deck title that surfaces the session-format mix at a
 * glance ("12 games · 3 presentations"). Prevents the "where did my scores
 * go?" reaction when a presentation-heavy deck shows a low overall score in
 * the All segment. Hides itself for never-played decks.
 */
const FormatMixChip = ({ analytics }: { analytics: DeckAnalytics }) => {
  const games = analytics.gameRollup?.sessionCount ?? 0;
  const presentations = analytics.presentationRollup?.sessionCount ?? 0;
  if (games === 0 && presentations === 0) return null;
  const parts: string[] = [];
  if (games > 0) parts.push(`${games} ${games === 1 ? "game" : "games"}`);
  if (presentations > 0) {
    parts.push(
      `${presentations} ${presentations === 1 ? "presentation" : "presentations"}`,
    );
  }
  return <span className={styles.mixChip}>{parts.join(" · ")}</span>;
};

export { DeckAnalyticsPage };
