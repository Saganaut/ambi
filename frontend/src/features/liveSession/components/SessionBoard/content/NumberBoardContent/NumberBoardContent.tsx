// Numeric-answer presentation + answer surface for the board. One component
// covers every scored/unscored moment, switched by `mode` (voting is handled by
// VoteBoardContent, so "vote" never reaches here):
//   - prompt      → a participant enters one number and sends it; numeric
//                   answers are never live-tallied, so there is no shared feed
//                   and the surface stays editable — re-sending overwrites the
//                   prior answer (last write before the round closes wins, like
//                   the backend's per-participant answer store). Host/projector
//                   sees a device note instead — or, once the round stops
//                   accepting (`mode` stays "prompt" for a LOCKED round), an
//                   answers-are-in note.
//   - liveResults → still answerable (same overwrite semantics); no live
//                   distribution exists for NUMBER, so responses stay hidden
//                   until the host reveals results — a note says so rather than
//                   faking an empty chart.
//   - results     → the submitted values arrive with the round result as a
//                   value→count map, rendered as a histogram binned over the
//                   authored [min, max] domain (falling back to the observed
//                   range when the slide is unbounded). The correct answer is
//                   marked only when the slide defines one — the reveal carries
//                   a `correctOption` for EXACT scoring only, not RANGE/CLOSEST
//                   — and the viewer's own outcome is banner'd from the result.
//
// The distribution and correct value are disclosed only at results. The config
// slice (`slide.number`: min/max/unit) travels on the slide so the board can
// bound the input and scale the chart, but never the answer, score mode, or
// tolerance (those are grading-only, dropped by NumberConfigView).
import { useEffect, useMemo, useState } from "react";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { Btn } from "@saganaut/ambi-ui";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./NumberBoardContent.module.css";

/** Bucket count of the results histogram. */
const HISTOGRAM_BUCKETS = 10;

interface NumberBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

interface Sample {
  value: number;
  count: number;
}

interface Bucket {
  lo: number;
  hi: number;
  count: number;
}

/** Parse the raw value→count tally into finite numeric samples. */
const parseSamples = (counts: Record<string, number>): Sample[] => {
  const samples: Sample[] = [];
  for (const [key, count] of Object.entries(counts)) {
    const value = Number(key);
    if (Number.isFinite(value) && count > 0) samples.push({ value, count });
  }
  return samples;
};

/**
 * Bin the samples into fixed buckets across [lo, hi]. A degenerate domain
 * (lo >= hi — an unbounded slide with a single distinct value) collapses to one
 * bucket so the chart still renders. Values outside the domain clamp to the end
 * buckets rather than being dropped.
 */
const buildBuckets = (samples: Sample[], lo: number, hi: number): Bucket[] => {
  if (!(hi > lo)) {
    const count = samples.reduce((sum, s) => sum + s.count, 0);
    return [{ lo, hi: lo, count }];
  }
  const span = hi - lo;
  const buckets: Bucket[] = Array.from({ length: HISTOGRAM_BUCKETS }, (_, i) => ({
    lo: lo + (span * i) / HISTOGRAM_BUCKETS,
    hi: lo + (span * (i + 1)) / HISTOGRAM_BUCKETS,
    count: 0,
  }));
  for (const { value, count } of samples) {
    let idx = Math.floor(((value - lo) / span) * HISTOGRAM_BUCKETS);
    if (idx < 0) idx = 0;
    if (idx >= HISTOGRAM_BUCKETS) idx = HISTOGRAM_BUCKETS - 1;
    buckets[idx].count += count;
  }
  return buckets;
};

/** Trim a number to at most 2 decimals for display (drops trailing zeros). */
const fmt = (n: number): string => (Math.round(n * 100) / 100).toString();

const NumberBoardContent = ({ slide, mode, interactive }: NumberBoardContentProps) => {
  const slideId = slide.id ?? "";
  const cfg = slide.number;
  // 0 is a legal bound, so guard on nullish rather than falsy.
  const min = cfg?.min ?? null;
  const max = cfg?.max ?? null;
  const unit = cfg?.unit?.trim() || null;

  const withUnit = (n: number): string =>
    unit ? `${fmt(n)} ${unit}` : fmt(n);

  const { sendAnswer } = useSessionConnection();
  // NUMBER isn't live-tallied, so the only distribution ever available arrives
  // with the revealed round result. There is no server-tracked "my answer", so
  // the submitted flag is round-local: cleared whenever the round changes.
  // `mode` stays "prompt" for a LOCKED round; `phase` tells closed-but-not-
  // revealed apart from a host projection of an open round.
  const { phase, results, viewerParticipantId } = useLiveSessionQuery();
  const accepting = phase === "SUBMIT" || phase === "SUBMIT_LIVE";
  const revealed = results?.slideId === slideId ? results : null;

  // Compose + submitted state are round-local: reset when the round changes.
  const [draft, setDraft] = useState("");
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setDraft("");
    setSubmitted(false);
  }, [slideId]);

  const parsed = draft.trim() === "" ? Number.NaN : Number(draft);
  const inRange =
    (min == null || parsed >= min) && (max == null || parsed <= max);
  const validDraft = Number.isFinite(parsed) && inRange;

  const send = () => {
    if (!interactive || mode === "results" || !validDraft) return;
    sendAnswer(slideId, { answerType: "NumberAnswer", value: parsed });
    setSubmitted(true);
  };

  // Results distribution, memoized off the revealed round so the derivations
  // below keep a stable dependency.
  const samples = useMemo(
    () => parseSamples(revealed?.optionCounts ?? {}),
    [revealed],
  );
  const { buckets, lo, hi, totalResponses, mean, maxCount } = useMemo(() => {
    const total = samples.reduce((sum, s) => sum + s.count, 0);
    const dataLo = samples.length ? Math.min(...samples.map((s) => s.value)) : 0;
    const dataHi = samples.length ? Math.max(...samples.map((s) => s.value)) : 0;
    // Authored domain when bounded; otherwise the observed range.
    const loBound = min ?? dataLo;
    const hiBound = max ?? dataHi;
    const built = buildBuckets(samples, loBound, hiBound);
    return {
      buckets: built,
      lo: loBound,
      hi: hiBound,
      totalResponses: total,
      mean: total
        ? samples.reduce((sum, s) => sum + s.value * s.count, 0) / total
        : 0,
      maxCount: Math.max(1, ...built.map((b) => b.count)),
    };
  }, [samples, min, max]);

  if (mode === "results") {
    const correctNum =
      revealed?.correctOption != null ? Number(revealed.correctOption) : Number.NaN;
    const hasCorrect = Number.isFinite(correctNum);
    // The marker's position along the domain (only meaningful for a real span).
    const domainSpan = hi > lo;
    const correctPct = domainSpan
      ? Math.min(100, Math.max(0, ((correctNum - lo) / (hi - lo)) * 100))
      : 50;

    const myOutcome = findViewerOutcome(revealed, slideId, viewerParticipantId);

    return (
      <div className={styles.numberBoardContent}>
        <OutcomeBanner
          outcome={myOutcome}
          correctText="You nailed it ✓"
          wrongText="Not quite."
        />

        {totalResponses === 0 ? (
          <p className={styles.note}>No responses were submitted this round.</p>
        ) : (
          <>
            <div
              className={styles.chart}
              role='img'
              aria-label='Distribution of the submitted numbers'>
              {hasCorrect && domainSpan && (
                <div
                  className={styles.correctMarker}
                  style={{ left: `${correctPct.toString()}%` }}
                  aria-hidden='true'>
                  <span className={styles.correctFlag}>{withUnit(correctNum)}</span>
                </div>
              )}
              <div className={styles.bars}>
                {buckets.map((bucket) => {
                  const height = (bucket.count / maxCount) * 100;
                  return (
                    <div
                      key={bucket.lo}
                      className={styles.barCol}
                      aria-label={`${withUnit(bucket.lo)} to ${withUnit(bucket.hi)}: ${bucket.count.toString()}`}>
                      <div
                        className={styles.bar}
                        style={{ height: `${height.toString()}%` }}>
                        {bucket.count > 0 && (
                          <span className={styles.barCount}>
                            {bucket.count.toString()}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className={styles.axis}>
              <span>{withUnit(lo)}</span>
              <span>{withUnit(hi)}</span>
            </div>
            <div className={styles.stats}>
              <span>
                {totalResponses.toString()}{" "}
                {totalResponses === 1 ? "response" : "responses"}
              </span>
              <span>avg {withUnit(mean)}</span>
            </div>
          </>
        )}

        {hasCorrect && (
          <p className={styles.correctAnswer}>
            <span className={styles.correctLabel}>Correct answer</span>
            {withUnit(correctNum)}
          </p>
        )}
      </div>
    );
  }

  if (!interactive) {
    // Host/projector (and everyone once the round closes): the number is entered
    // on each participant's own device, and nothing is shown here until results.
    return (
      <div className={styles.numberBoardContent}>
        <p className={styles.note}>
          {accepting
            ? "Enter your answer on your own device."
            : "Answers are in — this round is closed."}
        </p>
      </div>
    );
  }

  const rangeHint =
    min != null && max != null
      ? `Enter a value from ${withUnit(min)} to ${withUnit(max)}.`
      : min != null
        ? `Enter a value of at least ${withUnit(min)}.`
        : max != null
          ? `Enter a value up to ${withUnit(max)}.`
          : null;

  return (
    <div className={styles.numberBoardContent}>
      {mode === "liveResults" && (
        <p className={styles.note}>
          Responses stay hidden until the host reveals the results.
        </p>
      )}
      <form
        className={styles.compose}
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}>
        <div className={styles.inputRow}>
          <input
            type='number'
            className={styles.input}
            aria-label='Your answer'
            placeholder='Enter a number…'
            value={draft}
            min={min ?? undefined}
            max={max ?? undefined}
            step='any'
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        <div className={styles.composeActions}>
          {submitted ? (
            <span className={styles.sent}>Answer sent — you can update it.</span>
          ) : (
            rangeHint && <span className={styles.hint}>{rangeHint}</span>
          )}
          <Btn type='submit' size='sm' variant='brand' isDisabled={!validDraft}>
            {submitted ? "Update answer" : "Send answer"}
          </Btn>
        </div>
      </form>
    </div>
  );
};

export { NumberBoardContent };
