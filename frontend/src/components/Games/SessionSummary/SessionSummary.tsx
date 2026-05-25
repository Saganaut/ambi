/**
 * Chunk 24 — PRESENTATION end-of-session screen. Rendered on ResultsPage
 * when the frozen `session.format === "PRESENTATION"` (GAME falls through to
 * `GameOver`).
 *
 * No rankings, no podium, no per-player tally — PRESENTATION sessions show a
 * room-aggregate chart per question, plus an Export button when at least one
 * element had `scoringEnabled = true` (since the host evidently wanted to
 * carry a score out of an otherwise-presentation flow).
 *
 * Aggregation reuses the same per-kind dispatch as `RoundDataView`; the only
 * difference is the source data shape (the wire-format `SessionSummaryMessage`
 * carries `aggregatedPayloads: AnswerPayload[]` directly).
 */
import { Link } from "@tanstack/react-router";
import {
  BarChart,
  type BarChartItem,
} from "@/components/Common/Charts/BarChart/BarChart";
import {
  FrequencyList,
  type FrequencyListItem,
} from "@/components/Common/Charts/FrequencyList/FrequencyList";
import type {
  SessionSummaryPayload,
  SessionSummaryRound,
} from "../../../store/interactiveSessionSlice";
import type { AnswerPayload, DeckElement } from "../../../types/elements";
import styles from "./SessionSummary.module.css";

interface SessionSummaryProps {
  summary: SessionSummaryPayload;
  roomCode: string;
}

const SessionSummary = ({ summary, roomCode }: SessionSummaryProps) => {
  const exportHref = summary.anyScoringEnabled
    ? `/api/interactive-sessions/${roomCode}/results/export`
    : null;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>Session summary</h1>
        <p className={styles.subtitle}>
          {summary.roundsPlayed} round{summary.roundsPlayed === 1 ? "" : "s"}{" "}
          aggregated below.
        </p>
        {exportHref && (
          <a className={styles.exportLink} href={exportHref} download>
            Export results (CSV)
          </a>
        )}
      </header>

      <ol className={styles.rounds}>
        {summary.rounds.map((round) => (
          <RoundCard key={round.roundIndex} round={round} />
        ))}
      </ol>

      <div className={styles.footer}>
        <Link to='/decks' className={styles.footerLink} viewTransition>
          Run another
        </Link>
        <Link to='/' className={styles.footerLink} viewTransition>
          Home
        </Link>
      </div>
    </div>
  );
};

const RoundCard = ({ round }: { round: SessionSummaryRound }) => {
  const element = round.element;
  const aggregate = renderAggregate(round.aggregatedPayloads, element);
  const isSlide = element.kind === "Slide";

  return (
    <li className={styles.round}>
      <div className={styles.roundHeader}>
        <span className={styles.roundIndex}>
          {isSlide ? "Slide" : "Round"} {round.roundIndex + 1}
        </span>
        <h2 className={styles.prompt}>{titleFor(element)}</h2>
      </div>
      {isSlide ? (
        <p className={styles.slideHint}>Slide — no responses to aggregate.</p>
      ) : (
        (aggregate ?? (
          <p className={styles.slideHint}>
            No aggregated view yet for {element.kind}.
          </p>
        ))
      )}
    </li>
  );
};

const titleFor = (e: DeckElement): string => {
  if (e.kind === "Slide") return e.chrome?.title ?? "(untitled slide)";
  return "prompt" in e ? (e.prompt ?? "") : "";
};

const renderAggregate = (
  payloads: AnswerPayload[],
  element: DeckElement,
): React.ReactNode => {
  switch (element.kind) {
    case "McqQuestion": {
      const counts = new Map<string, number>();
      for (const p of payloads) {
        if (p.kind === "McqAnswer") {
          for (const oid of p.optionIds ?? []) {
            counts.set(oid, (counts.get(oid) ?? 0) + 1);
          }
        }
      }
      const correctIds = new Set(element.correctOptionIds ?? []);
      const bars: BarChartItem[] = (element.options ?? []).map((o) => ({
        label: o.text ?? "",
        value: counts.get(o.id ?? "") ?? 0,
        highlight: o.id ? correctIds.has(o.id) : false,
      }));
      return (
        <BarChart items={bars} total={payloads.length} caption='Responses' />
      );
    }
    case "WordCloudQuestion":
    case "TextQuestion": {
      const counts = new Map<string, number>();
      for (const p of payloads) {
        if (p.kind === "TextAnswer" && p.text) {
          const key = p.text.trim();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
        if (p.kind === "WordCloudAnswer") {
          for (const word of p.words ?? []) {
            const key = word.trim();
            if (key.length > 0) counts.set(key, (counts.get(key) ?? 0) + 1);
          }
        }
      }
      const items: FrequencyListItem[] = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([text, count]) => ({ text, count }));
      return (
        <FrequencyList
          items={items}
          total={payloads.length}
          caption='Submissions'
          emptyMessage='No submissions.'
        />
      );
    }
    case "NumberQuestion": {
      const counts = new Map<string, number>();
      for (const p of payloads) {
        if (p.kind === "NumberAnswer" && p.value !== undefined) {
          counts.set(String(p.value), (counts.get(String(p.value)) ?? 0) + 1);
        }
      }
      const items: FrequencyListItem[] = [...counts.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([text, count]) => ({
          text: text + (element.unitLabel ?? ""),
          count,
        }));
      return (
        <FrequencyList
          items={items}
          total={payloads.length}
          caption='Guesses'
          emptyMessage='No guesses.'
        />
      );
    }
    default:
      return null;
  }
};

export { SessionSummary };
