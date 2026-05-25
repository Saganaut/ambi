/**
 * Per-element accordion row for the deck-analytics dashboard.
 *
 * The card collapses to a one-line summary (kind badge + title + presented /
 * answered / accuracy) and expands to reveal the response distribution plus
 * the full stats table. The expanded body uses {@link DistributionChart} for
 * the bar list and a small <dl>-style table for everything else.
 *
 * Accuracy is suppressed entirely in the Presentations segment when the
 * deck has zero scored elements (per the chunk-16 open question) — without
 * that rule, presentation-only decks would show a column of meaningless 0%s.
 */
import { useState } from "react";
import { ChevronRightIcon } from "@heroicons/react/24/outline";

import type { ElementStats } from "@/store/BrainFlexApi";

import { DistributionChart } from "./DistributionChart";
import {
  KIND_BADGE_LABEL,
  isNoDistribution,
  type DeckElement,
  type Segment,
} from "./helpers";
import styles from "./ElementCard.module.css";

interface ElementCardProps {
  elementId: string;
  element: DeckElement | undefined;
  stats: ElementStats;
  segment: Segment;
  deckHasScoredAnswers: boolean;
}

const ElementCard = ({
  elementId,
  element,
  stats,
  segment,
  deckHasScoredAnswers,
}: ElementCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const kind = element?.kind;
  const title = element
    ? (element.chrome?.title?.trim() ? element.chrome.title : "(untitled)")
    : "(deleted element)";

  const suppressAccuracy =
    segment === "PRESENTATIONS" && !deckHasScoredAnswers;
  const accuracy =
    !suppressAccuracy && stats.answeredCount && stats.answeredCount > 0
      ? (stats.correctCount ?? 0) / stats.answeredCount
      : undefined;

  const kindLabel = kind ? KIND_BADGE_LABEL[kind] : "Element";
  const noDistribution = isNoDistribution(kind);

  return (
    <div className={styles.card} data-expanded={expanded ? "true" : undefined}>
      <button
        type='button'
        className={styles.header}
        aria-expanded={expanded}
        onClick={() => {
          setExpanded((prev) => !prev);
        }}>
        <ChevronRightIcon className={styles.chevron} aria-hidden='true' />
        <span className={styles.kindBadge}>{kindLabel}</span>
        <span className={styles.title}>{title}</span>
        <span className={styles.summary}>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Presented</span>
            <span className={styles.statValue}>{stats.presentedCount ?? 0}</span>
          </span>
          <span className={styles.stat}>
            <span className={styles.statLabel}>Answered</span>
            <span className={styles.statValue}>{stats.answeredCount ?? 0}</span>
          </span>
          {accuracy !== undefined && (
            <span className={styles.stat}>
              <span className={styles.statLabel}>Accuracy</span>
              <span className={styles.statValue}>
                {(accuracy * 100).toFixed(0)}%
              </span>
            </span>
          )}
        </span>
      </button>
      {expanded && (
        <div className={styles.body}>
          <div className={styles.distributionPane}>
            <h3 className={styles.sectionHeading}>Response distribution</h3>
            <DistributionChart
              elementId={elementId}
              element={element}
              stats={stats}
            />
          </div>
          <dl className={styles.statsTable}>
            <dt>Presented</dt>
            <dd>{stats.presentedCount ?? 0}</dd>
            <dt>Answered</dt>
            <dd>{stats.answeredCount ?? 0}</dd>
            {!suppressAccuracy && (
              <>
                <dt>Correct</dt>
                <dd>{noDistribution ? "—" : (stats.correctCount ?? 0)}</dd>
                <dt>Accuracy</dt>
                <dd>
                  {accuracy === undefined
                    ? "—"
                    : `${(accuracy * 100).toFixed(1)}%`}
                </dd>
              </>
            )}
            <dt>Avg time</dt>
            <dd>
              {stats.averageTimeMs
                ? `${(stats.averageTimeMs / 1000).toFixed(1)} s`
                : "—"}
            </dd>
            <dt>Reactions</dt>
            <dd>{stats.reactionsReceived ?? 0}</dd>
            <dt>Chat messages</dt>
            <dd>{stats.chatMessagesDuringRound ?? 0}</dd>
          </dl>
        </div>
      )}
    </div>
  );
};

export { ElementCard };
