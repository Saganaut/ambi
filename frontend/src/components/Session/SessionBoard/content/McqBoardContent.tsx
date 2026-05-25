// MCQ presentation + answer surface for the board. A single component covers
// every moment, switched by `mode`:
//   - prompt      → option cards; selectable when `interactive` (participant on
//                   their own device), read-only when projected/host.
//   - liveResults → cards with the response tally filling in; still answerable
//                   for a participant who hasn't submitted yet.
//   - results     → cards with the final distribution + the correct answer(s)
//                   highlighted.
//
// Answering: a participant builds a draft selection then taps Submit, which
// publishes an McqAnswer over the session connection and locks the inputs. The
// host's "end submit phase" also flushes the current draft (useFlushOnClosing).
// Results distribution comes from the round-result broadcast (per-option counts
// derived from each player's submitted McqAnswer).
import { useState } from "react";
import type { AnswerPayload, McqQuestion } from "@/types/elements";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { useFlushOnClosing } from "./useFlushOnClosing";
import { useSession } from "@/pages/SessionPage/useSession";
import { useSessionConnection } from "@/pages/SessionPage/SessionConnectionContext";
import { useAppDispatch } from "@/store/hooks";
import {
  answerSubmittedLocally,
  type RoundResultPayload,
} from "@/store/interactiveSessionSlice";
import { Btn } from "@/components/Common/Buttons/Btn";
import styles from "./McqBoardContent.module.css";

interface McqBoardContentProps {
  question: McqQuestion;
  mode: BoardQuestionMode;
  interactive: boolean;
  /** optionId → response count. Defaults to the live round-result tally. */
  distribution?: Record<string, number>;
}

/** Per-option response counts from the round result for this element. */
const deriveDistribution = (
  roundResult: RoundResultPayload | null,
  elementId: string,
): Record<string, number> | undefined => {
  if (roundResult?.element.id !== elementId) return undefined;
  const counts: Record<string, number> = {};
  for (const pr of roundResult.playerResults) {
    if (pr.payload?.kind === "McqAnswer") {
      for (const optionId of pr.payload.optionIds ?? []) {
        counts[optionId] = (counts[optionId] ?? 0) + 1;
      }
    }
  }
  return counts;
};

const McqBoardContent = ({
  question,
  mode,
  interactive,
  distribution,
}: McqBoardContentProps) => {
  const options = question.options ?? [];
  const correctIds = new Set(question.correctOptionIds ?? []);
  const maxSelections =
    question.allowMultipleSelect === true
      ? (question.maxSelections ?? options.length)
      : 1;
  const elementId = question.id ?? "";

  const dispatch = useAppDispatch();
  const { sendAnswer } = useSessionConnection();
  // Live fields come through the one merged session view, not a direct slice
  // read. myAnswer is cleared at the top of every round, so a non-null value
  // here means this participant has already locked in their answer.
  const { roundResult, myAnswer } = useSession();
  const submitted = myAnswer !== null;

  // Draft selection until the participant submits.
  const [selected, setSelected] = useState<Set<string>>(() => new Set());

  const submit = () => {
    if (!interactive || submitted || selected.size === 0) return;
    const payload: AnswerPayload = {
      kind: "McqAnswer",
      optionIds: [...selected],
    };
    sendAnswer(elementId, payload);
    dispatch(answerSubmittedLocally(payload));
  };

  // Host ended the submit phase → flush this device's draft before it freezes.
  useFlushOnClosing(question.id, submit);

  const resolvedDistribution =
    distribution ?? deriveDistribution(roundResult, elementId);

  const showResults = mode === "results" || mode === "liveResults";
  const revealCorrect = mode === "results";
  const canSelect = interactive && !submitted && mode !== "results";

  const totalResponses = Object.values(resolvedDistribution ?? {}).reduce(
    (sum, n) => sum + n,
    0,
  );

  const toggle = (id: string) => {
    if (!canSelect) return;
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
        return next;
      }
      // Single-select replaces; multi-select respects the cap.
      if (maxSelections === 1) return new Set([id]);
      if (next.size >= maxSelections) return prev;
      next.add(id);
      return next;
    });
  };

  // Even two-column grid, matching the editor's option layout.
  const columns = options.length ? Math.max(Math.ceil(options.length / 2), 2) : 2;

  return (
    <div className={styles.mcqBoardContent}>
      <div
        className={styles.options}
        style={{ "--cols": columns } as React.CSSProperties}>
        {options.map((option) => {
          const id = option.id ?? "";
          const isSelected = selected.has(id);
          const isCorrect = revealCorrect && correctIds.has(id);
          const count = resolvedDistribution?.[id] ?? 0;
          const pct =
            totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;

          const classes = [
            styles.option,
            isSelected ? styles.selected : "",
            isCorrect ? styles.correct : "",
            canSelect ? styles.selectable : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={id}
              type='button'
              className={classes}
              disabled={!canSelect}
              aria-pressed={canSelect ? isSelected : undefined}
              onClick={() => {
                toggle(id);
              }}
              style={
                { "--option-accent": option.color ?? "var(--bg-brand)" } as React.CSSProperties
              }>
              {showResults && (
                <span
                  className={styles.bar}
                  style={{ width: `${pct.toString()}%` }}
                  aria-hidden='true'
                />
              )}
              <span className={styles.label}>{option.text}</span>
              {showResults && (
                <span className={styles.pct}>{pct.toString()}%</span>
              )}
            </button>
          );
        })}
      </div>

      {interactive && mode !== "results" && (
        <div className={styles.actions}>
          {submitted ? (
            <p className={styles.submitted}>Answer locked in ✓</p>
          ) : (
            <Btn
              size='sm'
              variant='brand'
              disabled={selected.size === 0}
              onClick={submit}>
              {maxSelections > 1 ? "Submit answer" : "Lock in answer"}
            </Btn>
          )}
        </div>
      )}
    </div>
  );
};

export { McqBoardContent };
