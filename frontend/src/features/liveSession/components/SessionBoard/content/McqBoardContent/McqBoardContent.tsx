// MCQ presentation + answer surface for the board. A single component covers
// every moment, switched by `mode`:
//   - prompt      → option cards; selectable when `interactive` (participant on
//                   their own device), read-only when projected/host.
//   - liveResults → cards with the response tally filling in; still answerable
//                   for a participant who hasn't submitted yet.
//   - results     → cards with the final distribution + the correct answer
//                   highlighted (disclosed only now, via the round result).
//
// Answering: a participant taps one or more options then Submit, which posts an
// McqAnswer over the session connection and locks the inputs. How many options may
// be picked comes from the slide's `answerSettings.maxSelections` (1 = single, 0 =
// unlimited, >1 = capped) via the shared `useCappedSelection` primitive; absent
// settings default to single-select. There is no auto-flush of an unsent draft —
// the Gen-2 round has no pre-close grace window and a locked round rejects
// submissions, so a participant must lock in before the host closes. The
// distribution comes from the live `optionCounts` tally; the correct option is
// disclosed only once the results are revealed (`results.correctOption`).
import { useEffect, useState } from "react";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import { useCappedSelection } from "../useCappedSelection";
import styles from "./McqBoardContent.module.css";

interface McqBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** The pick-count guidance for a multi-select round (0 = unlimited, >1 = capped). */
const selectionHint = (max: number): string =>
  max === 0 ? "Select any number" : `Select up to ${max.toString()}`;

const McqBoardContent = ({ slide, mode, interactive }: McqBoardContentProps) => {
  const options = slide.options ?? [];
  const slideId = slide.id ?? "";

  const { sendAnswer } = useSessionConnection();
  // Live distribution + the disclosed answer key come from the read model. There
  // is no server-tracked "my answer", so the locked-in state is local: cleared
  // whenever the round (slide) changes.
  const { optionCounts, results } = useLiveSessionQuery();
  const revealedCorrect =
    results?.slideId === slideId ? results.correctOption : null;

  // How many options may be chosen; absent settings → single-select.
  const maxSelections = slide.answerSettings?.maxSelections ?? 1;
  const { selected, toggle, isSelected, atCap } = useCappedSelection(
    maxSelections,
    slideId,
  );
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setSubmitted(false);
  }, [slideId]);

  const submit = () => {
    if (!interactive || submitted || selected.length === 0) return;
    sendAnswer(slideId, { answerType: "McqAnswer", optionIds: selected });
    setSubmitted(true);
  };

  const showResults = mode === "results" || mode === "liveResults";
  const revealCorrect = mode === "results";
  const canSelect = interactive && !submitted && mode !== "results";

  const totalResponses = Object.values(optionCounts).reduce(
    (sum, n) => sum + n,
    0,
  );

  // Even two-column grid, matching the editor's option layout.
  const columns = options.length
    ? Math.max(Math.ceil(options.length / 2), 2)
    : 2;

  return (
    <div className={styles.mcqBoardContent}>
      <div
        className={styles.options}
        style={{ "--cols": columns } as React.CSSProperties}>
        {options.map((option) => {
          const id = option.id ?? "";
          const thumbnailSrc = option.imageUrl ?? null;
          const optionSelected = isSelected(id);
          const isCorrect = revealCorrect && revealedCorrect === id;
          const count = optionCounts[id] ?? 0;
          const pct =
            totalResponses > 0 ? Math.round((count / totalResponses) * 100) : 0;
          // At a >1 cap, unselected options can't be added (but chosen ones can
          // still be deselected).
          const optionSelectable = canSelect && (optionSelected || !atCap);

          const classes = [
            styles.option,
            optionSelected ? styles.selected : "",
            isCorrect ? styles.correct : "",
            optionSelectable ? styles.selectable : "",
          ]
            .filter(Boolean)
            .join(" ");

          return (
            <button
              key={id}
              type='button'
              className={classes}
              disabled={!optionSelectable}
              aria-pressed={canSelect ? optionSelected : undefined}
              onClick={() => {
                toggle(id);
              }}
              style={
                {
                  "--option-accent": option.color ?? "var(--bg-brand)",
                } as React.CSSProperties
              }>
              {showResults && (
                <span
                  className={styles.bar}
                  style={{ width: `${pct.toString()}%` }}
                  aria-hidden='true'
                />
              )}
              {thumbnailSrc && (
                <img className={styles.thumbnail} src={thumbnailSrc} alt='' />
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
            <>
              {maxSelections !== 1 && (
                <span className={styles.hint}>{selectionHint(maxSelections)}</span>
              )}
              <Btn
                size='sm'
                variant='brand'
                disabled={selected.length === 0}
                onClick={submit}>
                Lock in answer
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { McqBoardContent };
