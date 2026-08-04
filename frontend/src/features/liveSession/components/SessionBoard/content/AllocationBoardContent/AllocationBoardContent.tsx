// Allocation (split-the-pool) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → one point entry per option; Submit posts the whole
//                   allocations map (AllocationAnswer) and may be re-sent until
//                   the round locks (the backend overrides maxSelections, so
//                   the last write before the lock wins).
//   - liveResults → per-option share / average bars aggregated from the
//                   `optionId@points` tally keys; still answerable pre-lock.
//   - results     → the bars stay, the authored key splits are disclosed (a
//                   `Key n ±t` pill plus a tick on the track) and — on a keyed
//                   round only — the viewer's own outcome is banner'd.
//
// The pool and the options (label, colour, presigned image) travel on the
// participant-safe `slide.allocation`; the key splits stay hidden until reveal
// and then arrive keyed by `optionId`, joined back to the config for display.
// Every option rides the submitted map, zeros included: the server validates
// each value against [0, pool] and the map's sum against the pool exactly, so
// an omitted option would read as an under-spend.
import { useEffect, useMemo, useState } from "react";
import type { CSSProperties } from "react";

import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import { AppImg } from "@components/Images/AppImg";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { tallyTotalsBySlot } from "../answerTally";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { indexedLabel } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./AllocationBoardContent.module.css";

interface AllocationBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** One option's aggregate over the round's `optionId@points` tally. */
interface OptionTotals {
  /** How many participants allocated to this option (zero-point spends count). */
  responses: number;
  /** Total points the crowd put on it. */
  points: number;
  /** Points per respondent. */
  mean: number;
}

/** The round's aggregate, plus one {@link OptionTotals} per option id. */
interface AllocationTotals {
  byOption: Record<string, OptionTotals>;
  totalPoints: number;
  /** The busiest option's respondent count — the round's response count. */
  responses: number;
}

const NO_TOTALS: OptionTotals = { responses: 0, points: 0, mean: 0 };

/**
 * Fold the per-option point arrays (index = points allocated, value = how many
 * participants chose that amount) into the numbers the bars read from. Zero-point
 * entries are emitted by the backend, so an option's row sum IS its respondent
 * count — and every respondent appears in every option's row, which is why the
 * round's response count is the busiest row rather than a sum.
 */
const summarize = (
  slots: Record<string, number[]>,
  optionIds: string[],
): AllocationTotals => {
  const byOption: Record<string, OptionTotals> = {};
  let totalPoints = 0;
  let responses = 0;
  for (const optionId of optionIds) {
    let optionResponses = 0;
    let optionPoints = 0;
    (slots[optionId] ?? []).forEach((count, points) => {
      optionResponses += count;
      optionPoints += points * count;
    });
    byOption[optionId] = {
      responses: optionResponses,
      points: optionPoints,
      mean: optionResponses ? optionPoints / optionResponses : 0,
    };
    totalPoints += optionPoints;
    responses = Math.max(responses, optionResponses);
  }
  return { byOption, totalPoints, responses };
};

const AllocationBoardContent = ({ slide, mode, interactive }: AllocationBoardContentProps) => {
  const slideId = slide.id ?? "";
  const allocation = slide.allocation;
  const options = useMemo(() => allocation?.options ?? [], [allocation?.options]);
  const pool = allocation?.totalPointsToAllocate ?? 0;

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId, allocationTargets } = useLiveSessionQuery();

  // Round-local draft: optionId → points, holding only the options the player
  // has actually typed into. Reset on round change; an untouched option reads
  // as 0, which is also what it submits as.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setDraft({});
    setSubmitted(false);
  }, [slideId]);

  // The map may be re-sent until the round locks (the backend overrides
  // maxSelections), so submitting never freezes the surface — only the round
  // moving to results does.
  const canAllocate = interactive && mode !== "results";
  const spent = options.reduce((sum, option) => sum + (draft[option.id ?? ""] ?? 0), 0);
  const remaining = pool - spent;
  const complete = pool > 0 && remaining === 0;

  const allocate = (optionId: string, raw: number) => {
    const points = Number.isFinite(raw) ? Math.min(pool, Math.max(0, Math.round(raw))) : 0;
    setDraft((prev) => ({ ...prev, [optionId]: points }));
  };

  const submit = () => {
    if (!canAllocate || !complete) return;
    const allocations: Record<string, number> = {};
    for (const option of options) {
      const optionId = option.id ?? "";
      allocations[optionId] = draft[optionId] ?? 0;
    }
    sendAnswer(slideId, { answerType: "AllocationAnswer", allocations });
    setSubmitted(true);
  };

  const showTotals = mode === "results" || mode === "liveResults";
  // Per-option arrays indexed by the point count the backend keyed on — a spend
  // runs 0..pool inclusive, so the slot count is pool + 1.
  const slots = showTotals ? tallyTotalsBySlot(optionCounts, pool + 1) : {};
  const totals = summarize(
    slots,
    options.map((option) => option.id ?? ""),
  );
  const showBars = showTotals && totals.responses > 0;
  const showTrack = showTotals || !canAllocate;

  // Revealed key splits: prefer the live event's copy for this slide, else the
  // snapshot seam (a client that joined mid-reveal — see the slice).
  const revealCorrect = mode === "results";
  const targets = revealCorrect
    ? ((results?.slideId === slideId ? results.allocationTargets : allocationTargets) ?? [])
    : [];

  // The viewer's own outcome, once results are revealed — only a keyed round
  // grades anything, and a collect-only one reveals an empty target list while
  // still marking everyone wrong, so it must not banner a verdict.
  const myOutcome =
    revealCorrect && targets.length > 0
      ? findViewerOutcome(results, slideId, viewerParticipantId)
      : undefined;

  const remainingText =
    remaining > 0
      ? `${remaining.toString()} of ${pool.toString()} points left`
      : remaining === 0
        ? `All ${pool.toString()} points allocated`
        : `${(-remaining).toString()} points over`;

  return (
    <div className={styles.allocationBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You split it right ✓"
        wrongText="Not quite — your split was off."
      />

      {mode === "prompt" && !interactive && (
        <p className={styles.note}>
          Players are splitting {pool.toString()} points across {options.length.toString()} options.
        </p>
      )}

      {showTotals && totals.responses === 0 && <p className={styles.note}>No responses yet.</p>}

      <ul className={styles.options}>
        {options.map((option, index) => {
          const optionId = option.id ?? "";
          const label = indexedLabel(option.text, "Option", index);
          const optionTotals = totals.byOption[optionId] ?? NO_TOTALS;
          // A full-pool spend makes the share equal mean / pool, so the two
          // readouts agree by construction — the server enforces that sum.
          const share = totals.totalPoints ? optionTotals.points / totals.totalPoints : 0;
          const target = targets.find((candidate) => candidate.optionId === optionId);
          const keyPoints = target?.points ?? 0;
          const onKey = target != null && Math.abs(optionTotals.mean - keyPoints) <= (target.tolerance ?? 0);

          return (
            <li
              key={optionId || index}
              className={[styles.option, onKey ? styles.onKey : ""].filter(Boolean).join(" ")}
              style={{ "--option-accent": option.color ?? "var(--bg-brand)" } as CSSProperties}>
              <div className={styles.face}>
                {option.imageUrl && (
                  <AppImg
                    className={styles.thumbnail}
                    src={option.imageUrl}
                    alt=""
                    fallbackSeed={optionId}
                  />
                )}
                <span className={styles.label}>{label}</span>
                {target && (
                  <span className={styles.keyPill}>
                    Key {keyPoints.toString()} ±{(target.tolerance ?? 0).toString()}
                  </span>
                )}
                {canAllocate && (
                  <input
                    type="number"
                    className={styles.input}
                    min={0}
                    max={pool}
                    step={1}
                    value={draft[optionId] ?? 0}
                    aria-label={`${label} points`}
                    onChange={(event) => {
                      allocate(optionId, Number(event.target.value));
                    }}
                  />
                )}
              </div>

              {showTrack && (
                <div className={styles.track}>
                  {showBars && (
                    <span
                      className={styles.bar}
                      style={{ width: `${(share * 100).toString()}%` }}
                      aria-hidden="true"
                    />
                  )}
                  {target && pool > 0 && (
                    <span
                      className={styles.keyTick}
                      style={{ insetInlineStart: `${((keyPoints / pool) * 100).toString()}%` }}
                      aria-hidden="true"
                    />
                  )}
                </div>
              )}

              {showBars && (
                <p className={styles.readout}>
                  <span className={styles.mean}>
                    {optionTotals.mean.toFixed(1)} of {pool.toString()}
                  </span>
                  <span className={styles.share}>{Math.round(share * 100).toString()}%</span>
                </p>
              )}
            </li>
          );
        })}
      </ul>

      {showBars && (
        <p className={styles.caption}>
          {totals.responses.toString()} {totals.responses === 1 ? "response" : "responses"}
        </p>
      )}

      {canAllocate && (
        <div className={styles.actions}>
          <p className={styles.remaining} aria-live="polite">
            {remainingText}
          </p>
          <BoardSubmitBar
            submitted={submitted}
            disabled={!complete}
            onSubmit={submit}
            idleLabel="Submit answer"
            resubmitLabel="Update answer"
            submittedNote="Answer submitted ✓">
            {!complete && (
              <span className={styles.hint}>
                {remaining < 0
                  ? `You've allocated ${(-remaining).toString()} too many.`
                  : `Allocate all ${pool.toString()} points to submit.`}
              </span>
            )}
          </BoardSubmitBar>
        </div>
      )}
    </div>
  );
};

export { AllocationBoardContent };
