/**
 * Chunk 24 — PRESENTATION round-end aggregated view. Renders in place of
 * `RoundResult` for sessions whose frozen `format === "PRESENTATION"`.
 *
 * Unlike `RoundResult`, this view never shows rankings, points, or a per-player
 * tally — PRESENTATION sessions don't carry a leaderboard chrome and the
 * audience cares about the room's aggregate response, not individual scores.
 * The renderer dispatches per-element-kind into the same chart primitives the
 * post-game `ReviewPanel` uses (`BarChart`, `FrequencyList`) so the visual
 * language is consistent across mid-session and post-session aggregation.
 */
import type { RoundResultPayload } from "../../../store/interactiveSessionSlice";
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
import styles from "./RoundDataView.module.css";

interface RoundDataViewProps {
  result: RoundResultPayload;
  isHost: boolean;
  isTurnBased: boolean;
  onNextRound: () => void;
}

const RoundDataView = ({
  result,
  isHost,
  isTurnBased,
  onNextRound,
}: RoundDataViewProps) => {
  const element = result.element;
  const payloads: AnswerPayload[] = result.playerResults
    .map((pr) => pr.payload)
    .filter((p): p is AnswerPayload => !!p);

  const aggregate = renderAggregate(payloads, element);
  const responseCount = payloads.length;
  const submittedCount = payloads.filter(
    (p) => p.kind !== "TimeoutAnswer",
  ).length;

  return (
    <div className={styles.overlay}>
      <div className={styles.panel}>
        <h2 className={styles.title}>{titleFor(element)}</h2>
        <p className={styles.summary}>
          {submittedCount} of {responseCount} responded
        </p>

        {aggregate ?? (
          <p className={styles.empty}>
            No aggregated view yet for {element.kind}.
          </p>
        )}

        {isHost && isTurnBased ? (
          <Btn onClick={onNextRound} className={styles.nextBtn}>
            Next
          </Btn>
        ) : (
          <p className={styles.autoAdvance}>Advancing soon…</p>
        )}
      </div>
    </div>
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
          emptyMessage='No one submitted.'
        />
      );
    }
    case "NumberQuestion": {
      const counts = new Map<string, number>();
      for (const p of payloads) {
        if (p.kind === "NumberAnswer" && p.value !== undefined) {
          const key = String(p.value);
          counts.set(key, (counts.get(key) ?? 0) + 1);
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
          emptyMessage='No one guessed.'
        />
      );
    }
    default:
      return null;
  }
};

export { RoundDataView };
