// Axis (free-form 2D placement) presentation + answer surface for the board.
// One component covers every moment, switched by `mode`:
//   - prompt      → tap-to-select, tap-at-point-to-place: pick an item chip from
//                   the bank, tap the plane to drop it at the tap's normalized
//                   coordinates; Submit posts the whole placement map
//                   (AxisAnswer) and may be re-sent until the round locks (the
//                   backend forces maxSelections=0, last write wins).
//   - liveResults → a 10×10 translucent heat overlay aggregated from the
//                   quantized `itemId@bx,by` tally keys, plus the viewer's own
//                   placed chips; still answerable pre-lock.
//   - results     → heat stays visible and the viewer's own outcome (correct /
//                   not) is banner'd from the round result. The correct targets
//                   themselves are not revealed yet — no event carries a
//                   map-shaped answer key (follow-up F1, same seam as D5).
//
// Tap-to-place (no drag) keeps the surface small-screen friendly: for a
// continuous plane the second tap inherently carries the coordinates. The
// keyboard path: placed chips are real buttons, arrow keys nudge in 2% steps.
import { useEffect, useMemo, useState } from "react";
import type { AxisPoint, SlideView } from "../../../store/liveSessionApi.gen";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import { seededShuffle } from "./seededShuffle";
import styles from "./AxisBoardContent.module.css";

/**
 * Bucket count per axis of the live tally's quantization grid. Manual mirror
 * of the backend's `AnswerTallyKeys.AXIS_TALLY_BUCKETS` (it is not a
 * request-DTO bound, so it does not flow through codegen — the same
 * keep-in-sync discipline as `NON_SCORABLE_SLIDE_TYPES` in slideContent.ts).
 */
const AXIS_TALLY_BUCKETS = 10;

/** Arrow-key nudge step for a focused placed chip, in normalized units. */
const KEYBOARD_NUDGE_STEP = 0.02;

interface AxisBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/**
 * Sum the live per-`itemId@bucketX,bucketY` tally into per-bucket totals
 * (keyed `"bx,by"`) — the bucket-split analogue of grid's `cellTotals`.
 */
const bucketTotals = (optionCounts: Record<string, number>): Record<string, number> => {
  const totals: Record<string, number> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    const bucket = key.split("@")[1];
    if (!bucket || count <= 0) continue;
    totals[bucket] = (totals[bucket] ?? 0) + count;
  }
  return totals;
};

const AxisBoardContent = ({ slide, mode, interactive }: AxisBoardContentProps) => {
  const slideId = slide.id ?? "";
  const axis = slide.axis;

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // The bank is shuffled per round, seeded by the slide id so the order is
  // stable on this device all round.
  const axisItems = axis?.items;
  const items = useMemo(
    () => seededShuffle(axisItems ?? [], slideId),
    [axisItems, slideId],
  );

  // Round-local placement draft: itemId → normalized point. Cleared when the
  // round changes.
  const [placements, setPlacements] = useState<Record<string, AxisPoint>>({});
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setPlacements({});
    setHeldItemId(null);
    setSubmitted(false);
  }, [slideId]);

  // Unlike single-shot kinds, a placement map may be re-sent until the round
  // locks (the backend forces maxSelections=0), so submitting never freezes
  // the surface — only the round moving to results does.
  const canPlace = interactive && mode !== "results";
  const allPlaced =
    items.length > 0 && items.every((item) => item.id && placements[item.id]);

  const submit = () => {
    if (!canPlace || !allPlaced) return;
    sendAnswer(slideId, { answerType: "AxisAnswer", placements });
    setSubmitted(true);
  };

  const showCounts = mode === "results" || mode === "liveResults";
  const totals = showCounts ? bucketTotals(optionCounts) : {};
  const highestTotal = Math.max(1, ...Object.values(totals));

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" && results?.slideId === slideId
      ? results.outcomes.find((o) => o.participantId === viewerParticipantId)
      : undefined;

  const bank = items.filter((item) => !(item.id && placements[item.id]));

  const labelOf = (label: string | undefined): string => label?.trim() || "Item";
  const endpointOf = (label: string | undefined, fallback: string): string =>
    label?.trim() || fallback;

  const placeAt = (event: React.MouseEvent<HTMLElement>) => {
    if (!canPlace || heldItemId == null) return;
    const rect = event.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    // (0,0) is the low/low corner — bottom-left as rendered — so screen y inverts.
    const point = {
      x: clamp01((event.clientX - rect.left) / rect.width),
      y: clamp01(1 - (event.clientY - rect.top) / rect.height),
    };
    setPlacements((prev) => ({ ...prev, [heldItemId]: point }));
    setHeldItemId(null);
  };

  const nudge = (itemId: string) => (event: React.KeyboardEvent) => {
    if (!canPlace) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-KEYBOARD_NUDGE_STEP, 0],
      ArrowRight: [KEYBOARD_NUDGE_STEP, 0],
      ArrowUp: [0, KEYBOARD_NUDGE_STEP],
      ArrowDown: [0, -KEYBOARD_NUDGE_STEP],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setPlacements((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: { x: clamp01(current.x + delta[0]), y: clamp01(current.y + delta[1]) },
      };
    });
  };

  // Only non-empty buckets render, so the heat layer stays a handful of nodes
  // rather than a hundred.
  const heatCells = Object.entries(totals).map(([bucket, total]) => {
    const [bx, by] = bucket.split(",").map(Number);
    if (!Number.isInteger(bx) || !Number.isInteger(by)) return null;
    return (
      <span
        key={bucket}
        className={styles.heatCell}
        style={
          {
            left: `${((bx / AXIS_TALLY_BUCKETS) * 100).toString()}%`,
            top: `${((1 - (by + 1) / AXIS_TALLY_BUCKETS) * 100).toString()}%`,
            width: `${(100 / AXIS_TALLY_BUCKETS).toString()}%`,
            height: `${(100 / AXIS_TALLY_BUCKETS).toString()}%`,
            "--bucket-heat": total / highestTotal,
          } as React.CSSProperties
        }
        aria-label={`${total.toString()} placements`}
      />
    );
  });

  return (
    <div className={styles.axisBoardContent}>
      {myOutcome && (
        <p className={myOutcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
          {myOutcome.correct
            ? "You placed everything on target ✓"
            : "Not quite — some placements were off."}
        </p>
      )}

      <div className={styles.planeFrame}>
        <span className={styles.axisLabelYHigh}>{endpointOf(axis?.yHighLabel, "High")}</span>
        <div className={styles.planeRow}>
          <span className={styles.axisLabelX}>{endpointOf(axis?.xLowLabel, "Low")}</span>
          <div
            className={[styles.plane, canPlace && heldItemId != null ? styles.planeArmed : ""]
              .filter(Boolean)
              .join(" ")}>
            {showCounts && heatCells}
            {canPlace && heldItemId != null && (
              <button
                type='button'
                className={styles.placeTarget}
                aria-label='Place on the plane'
                onClick={placeAt}
              />
            )}
            {items.map((item) => {
              const itemId = item.id;
              const point = itemId ? placements[itemId] : undefined;
              if (!itemId || !point) return null;
              return (
                <button
                  key={itemId}
                  type='button'
                  className={styles.placedChip}
                  style={{
                    left: `${(point.x * 100).toString()}%`,
                    top: `${((1 - point.y) * 100).toString()}%`,
                  }}
                  disabled={!canPlace}
                  aria-label={`Pick ${labelOf(item.label)} back up (arrow keys nudge it)`}
                  onKeyDown={nudge(itemId)}
                  onClick={() => {
                    setPlacements((prev) => {
                      const { [itemId]: _lifted, ...rest } = prev;
                      return rest;
                    });
                    setHeldItemId(itemId);
                  }}>
                  {labelOf(item.label)}
                </button>
              );
            })}
          </div>
          <span className={styles.axisLabelX}>{endpointOf(axis?.xHighLabel, "High")}</span>
        </div>
        <span className={styles.axisLabelYLow}>{endpointOf(axis?.yLowLabel, "Low")}</span>
      </div>

      {interactive && mode !== "results" && (
        <div className={styles.actions}>
          <div className={styles.bank}>
            {bank.length === 0 ? (
              <span className={styles.hint}>All items placed.</span>
            ) : (
              bank.map((item) => (
                <button
                  key={item.id}
                  type='button'
                  className={[styles.bankChip, heldItemId === item.id ? styles.held : ""]
                    .filter(Boolean)
                    .join(" ")}
                  aria-pressed={heldItemId === item.id}
                  disabled={!canPlace}
                  onClick={() => {
                    setHeldItemId((prev) => (prev === item.id ? null : (item.id ?? null)));
                  }}>
                  {labelOf(item.label)}
                </button>
              ))
            )}
            {heldItemId != null && (
              <span className={styles.hint}>Now tap the plane to place it.</span>
            )}
          </div>
          {submitted && <p className={styles.submittedNote}>Answer submitted ✓</p>}
          <Btn size='sm' variant='brand' disabled={!allPlaced} onClick={submit}>
            {submitted ? "Update answer" : "Submit answer"}
          </Btn>
        </div>
      )}
    </div>
  );
};

export { AXIS_TALLY_BUCKETS, AxisBoardContent };
