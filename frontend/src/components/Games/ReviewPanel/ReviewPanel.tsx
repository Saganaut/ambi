/**
 * Post-interactiveSession review. Paginates through every element played and renders
 * per-kind summaries:
 *   SLIDE     — title + body (no answers to aggregate)
 *   MCQ       — horizontal bar chart of option-id counts
 *   TEXT      — frequency list of unique submissions
 *   NUMBER    — list of submitted values sorted by frequency
 *   other     — just the totals + a per-player breakdown
 *
 * Aggregation is computed client-side from the per-player payloads so we don't
 * need a backend-side per-kind aggregator (each round-result already carries
 * every submission). Per-player details are collapsible.
 */
import { useState } from "react";
import type {
  PlayerRoundResponse,
  RoundReview,
  InteractiveSessionReviewResponse,
} from "../../../store/BrainFlexApi";
import type { AnswerPayload, DeckElement } from "../../../types/elements";
import {
  BarChart,
  type BarChartItem,
} from "@/components/Common/Charts/BarChart/BarChart";
import {
  FrequencyList,
  type FrequencyListItem,
} from "@/components/Common/Charts/FrequencyList/FrequencyList";
import { Btn } from "@/components/Common/Buttons/Btn";
import { Tabs, type TabsItem } from "@/components/Common/Tabs/Tabs";
import styles from "./ReviewPanel.module.css";

export interface ReviewPanelProps {
  review: InteractiveSessionReviewResponse;
}

const roundTabId = (i: number) => `round-${String(i)}`;

const ReviewPanel = ({ review }: ReviewPanelProps) => {
  const rounds = review.rounds ?? [];
  const [activeId, setActiveId] = useState(() => roundTabId(0));
  const [showDetails, setShowDetails] = useState(false);

  if (rounds.length === 0) {
    return <p className={styles.empty}>No rounds to review.</p>;
  }
  const scoringEnabled = review.scoringEnabled !== false;
  const activeIndex = Math.max(
    0,
    rounds.findIndex((_, i) => roundTabId(i) === activeId),
  );
  const items: TabsItem[] = rounds.map((round, i) => ({
    id: roundTabId(i),
    label: String(i + 1),
    panel: (
      <RoundContent
        round={round}
        index={i}
        total={rounds.length}
        scoringEnabled={scoringEnabled}
        showDetails={showDetails}
        onToggleDetails={() => {
          setShowDetails((prev) => !prev);
        }}
      />
    ),
  }));

  return (
    <div className={styles.panel}>
      <Tabs
        items={items}
        value={activeId}
        onChange={setActiveId}
        variant='pill'
        ariaLabel='Round'
      />

      <div className={styles.navBtns}>
        <Btn
          size='sm'
          type='button'
          disabled={activeIndex === 0}
          onClick={() => {
            setActiveId(roundTabId(Math.max(0, activeIndex - 1)));
          }}>
          ← Previous
        </Btn>
        <Btn
          size='sm'
          type='button'
          disabled={activeIndex >= rounds.length - 1}
          onClick={() => {
            setActiveId(
              roundTabId(Math.min(rounds.length - 1, activeIndex + 1)),
            );
          }}>
          Next →
        </Btn>
      </div>
    </div>
  );
};

interface RoundContentProps {
  round: RoundReview;
  index: number;
  total: number;
  scoringEnabled: boolean;
  showDetails: boolean;
  onToggleDetails: () => void;
}

const RoundContent = ({
  round,
  index,
  total,
  scoringEnabled,
  showDetails,
  onToggleDetails,
}: RoundContentProps) => {
  const element: DeckElement | undefined = round.element;
  const isSlide = element?.kind === "Slide";
  const aggregateView = element ? renderAggregate(round, element) : null;

  return (
    <div className={styles.roundContent}>
      <div className={styles.questionHeader}>
        <span className={styles.roundLabel}>
          {isSlide ? "Slide" : "Round"} {index + 1} / {total}
        </span>
        {element && (
          <h3 className={styles.questionText}>{titleFor(element)}</h3>
        )}
        {element && bodyFor(element) && (
          <p className={styles.correctAnswer}>{bodyFor(element)}</p>
        )}
      </div>

      {!isSlide && aggregateView}

      {!isSlide && (round.timedOutCount ?? 0) > 0 && (
        <p className={styles.timedOut}>
          {round.timedOutCount} player(s) didn&apos;t answer in time.
        </p>
      )}

      {!isSlide && (
        <Btn size='sm' type='button' onClick={onToggleDetails}>
          {showDetails ? "Hide" : "Show"} per-player details
        </Btn>
      )}

      {!isSlide && showDetails && (
        <table className={styles.details}>
          <thead>
            <tr>
              <th scope='col'>Player</th>
              <th scope='col'>Answer</th>
              <th scope='col'>Result</th>
              {scoringEnabled && <th scope='col'>Points</th>}
            </tr>
          </thead>
          <tbody>
            {(round.playerAnswers ?? []).map((pa) => (
              <tr
                key={pa.playerId}
                className={pa.wasCorrect ? styles.rowCorrect : styles.rowWrong}>
                <td>{pa.userName}</td>
                <td>{renderSubmission(element, pa.payload)}</td>
                <td>{pa.wasCorrect ? "✓" : "✗"}</td>
                {scoringEnabled && <td>{pa.pointsAwarded ?? 0}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

// ─── per-kind rendering ───────────────────────────────────────────────────────

const titleFor = (e: DeckElement): string => {
  if (e.kind === "Slide") return e.chrome?.title ?? "(untitled slide)";
  return "prompt" in e ? (e.prompt ?? "") : "";
};

const bodyFor = (e: DeckElement): string | undefined => {
  if (e.kind === "Slide") return e.body ?? undefined;
  return undefined;
};

const renderAggregate = (round: RoundReview, element: DeckElement) => {
  const answers: PlayerRoundResponse[] = round.playerAnswers ?? [];
  switch (element.kind) {
    case "McqQuestion": {
      const options = element.options ?? [];
      const counts = new Map<string, number>();
      for (const a of answers) {
        const p = a.payload;
        if (p?.kind === "McqAnswer") {
          for (const oid of p.optionIds ?? []) {
            counts.set(oid, (counts.get(oid) ?? 0) + 1);
          }
        }
      }
      const correctIds = new Set(element.correctOptionIds ?? []);
      const bars: BarChartItem[] = options.map((o) => ({
        label: o.text ?? "",
        value: counts.get(o.id ?? "") ?? 0,
        highlight: o.id ? correctIds.has(o.id) : false,
      }));
      return (
        <BarChart items={bars} total={answers.length} caption='Distribution' />
      );
    }
    case "TextQuestion": {
      const counts = new Map<string, number>();
      for (const a of answers) {
        const p = a.payload;
        if (p?.kind === "TextAnswer" && p.text) {
          const key = p.text.trim();
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      const items: FrequencyListItem[] = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([text, count]) => ({
          text,
          count,
          correct: text.toLowerCase() === element.correctAnswer?.toLowerCase(),
        }));
      return (
        <FrequencyList
          items={items}
          total={answers.length}
          caption='Submissions'
          emptyMessage='No one submitted.'
        />
      );
    }
    case "NumberQuestion": {
      const counts = new Map<string, number>();
      for (const a of answers) {
        const p = a.payload;
        if (p?.kind === "NumberAnswer" && p.value !== undefined) {
          const key = String(p.value);
          counts.set(key, (counts.get(key) ?? 0) + 1);
        }
      }
      const items: FrequencyListItem[] = [...counts.entries()]
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        .map(([text, count]) => ({
          text: text + (element.unitLabel ?? ""),
          count,
          correct: Number(text) === element.correctValue,
        }));
      return (
        <FrequencyList
          items={items}
          total={answers.length}
          caption='Guesses'
          emptyMessage='No one guessed.'
        />
      );
    }
    default:
      return (
        <p className={styles.timedOut}>
          Aggregate view for {element.kind} coming soon.
        </p>
      );
  }
};

const renderSubmission = (
  element: DeckElement | undefined,
  payload: AnswerPayload | undefined,
): string => {
  if (!payload) return "(no answer)";
  switch (payload.kind) {
    case "TimeoutAnswer":
      return "(timed out)";
    case "TextAnswer":
      return payload.text ?? "(empty)";
    case "NumberAnswer":
      return payload.value !== undefined ? String(payload.value) : "(empty)";
    case "McqAnswer": {
      const oid = payload.optionIds?.[0];
      if (element?.kind === "McqQuestion") {
        const opt = element.options?.find((o) => o.id === oid);
        return opt?.text ?? oid ?? "(unknown)";
      }
      return oid ?? "(unknown)";
    }
    default:
      return `(${payload.kind})`;
  }
};

export { ReviewPanel };
