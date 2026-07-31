// Scales (continuous rating) presentation + answer surface for the board. One
// component covers every moment, switched by `mode`:
//   - prompt      → one native range slider per statement (0..1, normalized);
//                   Submit posts the whole positions map (ScalesAnswer) and may
//                   be re-sent until the round locks (the backend forces
//                   maxSelections=0, last write wins).
//   - liveResults → a 10-bucket heat strip under each statement's track,
//                   aggregated from the quantized `statementId@bucket` tally
//                   keys; still answerable pre-lock.
//   - results     → the strips stay visible and the viewer's own outcome
//                   (correct / not) is banner'd from the round result. The
//                   correct targets themselves are not revealed yet — no event
//                   carries a map-shaped answer key (follow-up F1, same seam as
//                   the axis/grid boards sit on).
//
// A native `<input type="range">` gives free ARIA slider semantics + keyboard
// support; `aria-valuetext` announces the scale-unit readout rather than the
// raw 0..1 position. Statements render in authored order — order is
// presentational for Scales, so (unlike item banks) there is no seeded shuffle.
import { useEffect, useMemo, useState } from "react";
import type { SlideView } from "../../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { formatScaleValue, positionToValue } from "@/shared/utils/scaleValue";
import { AXIS_TALLY_BUCKETS, tallyTotalsBySlot } from "../answerTally";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { indexedLabel, labelOrFallback } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./ScalesBoardContent.module.css";

/** Sliders open at the track midpoint until the player actually moves one. */
const MIDPOINT = 0.5;

interface ScalesBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const ScalesBoardContent = ({ slide, mode, interactive }: ScalesBoardContentProps) => {
  const slideId = slide.id ?? "";
  const scales = slide.scales;
  const min = scales?.min ?? 0;
  const max = scales?.max ?? 1;
  const items = useMemo(() => scales?.items ?? [], [scales?.items]);

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // Round-local draft: statementId → normalized position, holding only the
  // statements the player has actually moved (the `touched` set). Reset on round
  // change. Untouched sliders show the midpoint but never enter the draft, so a
  // player can't silently submit midpoint bias.
  const [draft, setDraft] = useState<Record<string, number>>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setDraft({});
    setTouched(new Set());
    setSubmitted(false);
  }, [slideId]);

  // A positions map may be re-sent until the round locks (the backend forces
  // maxSelections=0), so submitting never freezes the surface — only the round
  // moving to results does.
  const canRate = interactive && mode !== "results";
  const allTouched =
    items.length > 0 && items.every((item) => item.id != null && touched.has(item.id));

  const rate = (statementId: string, position: number) => {
    setDraft((prev) => ({ ...prev, [statementId]: position }));
    setTouched((prev) => {
      if (prev.has(statementId)) return prev;
      const next = new Set(prev);
      next.add(statementId);
      return next;
    });
  };

  const submit = () => {
    if (!canRate || !allTouched) return;
    sendAnswer(slideId, { answerType: "ScalesAnswer", positions: draft });
    setSubmitted(true);
  };

  const showCounts = mode === "results" || mode === "liveResults";
  // Per-statement bucket arrays, indexed by the quantized position the backend
  // keyed on: SCALES shares the AXIS bucket resolution (one constant there).
  const totals = showCounts ? tallyTotalsBySlot(optionCounts, AXIS_TALLY_BUCKETS) : {};

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  const leftAnchor = labelOrFallback(scales?.leftLabel, min.toString());
  const rightAnchor = labelOrFallback(scales?.rightLabel, max.toString());

  return (
    <div className={styles.scalesBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You rated everything on target ✓"
        wrongText="Not quite — some ratings were off."
      />

      <ul className={styles.statements}>
        {items.map((item, index) => {
          const statementId = item.id ?? "";
          const position = draft[statementId] ?? MIDPOINT;
          const scaleValue = positionToValue(position, min, max);
          const label = indexedLabel(item.label, "Statement", index);
          const bucketArr = totals[statementId];
          const highest = bucketArr ? Math.max(1, ...bucketArr) : 1;

          return (
            <li
              key={statementId || index}
              className={styles.statement}
              style={
                { "--statement-accent": item.color ?? "var(--bg-brand)" } as React.CSSProperties
              }
            >
              <div className={styles.statementFace}>
                {item.imageUrl && (
                  <img className={styles.statementImage} src={item.imageUrl} alt="" />
                )}
                <span className={styles.statementLabel}>{label}</span>
              </div>
              <div className={styles.trackRow}>
                <span className={styles.anchor}>{leftAnchor}</span>
                {/* Slider and heat strip stack in one column so the strip's
                    buckets line up under the track positions. */}
                <div className={styles.trackBody}>
                  {canRate ? (
                    <input
                      type="range"
                      className={styles.slider}
                      min={0}
                      max={1}
                      step="any"
                      value={position}
                      aria-label={label}
                      aria-valuetext={formatScaleValue(scaleValue)}
                      onChange={(event) => {
                        rate(statementId, Number(event.target.value));
                      }}
                    />
                  ) : (
                    <div className={styles.staticTrack} aria-hidden="true" />
                  )}
                  {showCounts && (
                    <div className={styles.heatStrip}>
                      {Array.from({ length: AXIS_TALLY_BUCKETS }, (_, bucket) => {
                        const total = bucketArr?.[bucket] ?? 0;
                        return (
                          <span
                            key={bucket}
                            className={styles.heatCell}
                            style={{ "--heat": total / highest } as React.CSSProperties}
                            aria-label={
                              total > 0
                                ? `${label}: ${total.toString()} at bucket ${(bucket + 1).toString()}`
                                : undefined
                            }
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
                <span className={styles.anchor}>{rightAnchor}</span>
                {canRate && touched.has(statementId) && (
                  <span className={styles.readout} aria-hidden="true">
                    {formatScaleValue(scaleValue)}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {canRate && (
        <div className={styles.actions}>
          <BoardSubmitBar
            submitted={submitted}
            disabled={!allTouched}
            onSubmit={submit}
            idleLabel="Submit answer"
            resubmitLabel="Update answer"
            submittedNote="Answer submitted ✓"
          >
            {!allTouched && <span className={styles.hint}>Rate every statement to submit.</span>}
          </BoardSubmitBar>
        </div>
      )}
    </div>
  );
};

export { ScalesBoardContent };
