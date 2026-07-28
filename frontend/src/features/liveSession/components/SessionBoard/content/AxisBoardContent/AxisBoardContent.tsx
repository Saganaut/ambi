// Axis (free-form 2D placement) presentation + answer surface for the board.
// One component covers every moment, switched by `mode`:
//   - prompt      → place one chip per authored item anywhere on the plane;
//                   Submit posts the whole placement map (AxisAnswer) and may be
//                   re-sent until the round locks (the backend forces
//                   maxSelections=0, last write wins).
//   - liveResults → a 10×10 translucent heat overlay aggregated from the
//                   quantized `itemId@bx,by` tally keys, plus the viewer's own
//                   placed chips; still answerable pre-lock.
//   - results     → heat stays visible and the viewer's own outcome (correct /
//                   not) is banner'd from the round result. The correct targets
//                   themselves are not revealed yet — no event carries a
//                   map-shaped answer key (follow-up F1, same seam as D5).
//
// Placement input — the drag / tap / arrow-key engine and the round-local draft
// it maintains — is `useBoardPlacement`, shared with the Place-on-Image board
// (the other continuous-surface board); this component owns only how the plane,
// its heat overlay and the chips render. The plane stays answerable after a
// submit, so the hook takes `lockOnSubmit: false`.
//
// Coordinates are normalized [0, 1] with (0, 0) the low/low corner — bottom-left
// as rendered — so screen y inverts on the way in (`invertY`) and back out again
// on render, the same frame the editor's `AxisPlaneEditor` and the grader work
// in. The draft placements are round-local, keyed off the slide id.
import { DragDropProvider } from "@dnd-kit/react";
import { useMemo, type CSSProperties } from "react";

import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import markerStyles from "@ui/MarkerBadge/MarkerBadge.module.css";
import { toRenderStyle } from "@utils/placementGeometry";
import type { AxisItemView, SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { BoardBank } from "../BoardBank/BoardBank";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { DraggableChip } from "../DraggableChip/DraggableChip";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { PlacementSurface } from "../PlacementSurface/PlacementSurface";
import { seededShuffle } from "../seededShuffle";
import { useBoardPlacement } from "../useBoardPlacement";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./AxisBoardContent.module.css";

/**
 * Bucket count per axis of the live tally's quantization grid. Manual mirror
 * of the backend's `AnswerTallyKeys.AXIS_TALLY_BUCKETS` (it is not a
 * request-DTO bound, so it does not flow through codegen — the same
 * keep-in-sync discipline as `NON_SCORABLE_SLIDE_TYPES` in slideContent.ts).
 */
const AXIS_TALLY_BUCKETS = 10;

/**
 * The plane's orientation, handed to the shared geometry at every call site:
 * (0, 0) is the low/low corner — bottom-left as rendered — so the screen y axis
 * inverts on the way into normalized space and back out again on render.
 */
const INVERT_Y = true;

interface AxisBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

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

  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // The bank is shuffled per round, seeded by the slide id so the order is
  // stable on this device all round; the authored order drives the numbers and
  // the palette colors.
  const axisItems = axis?.items;
  const items = useMemo(() => seededShuffle(axisItems ?? [], slideId), [axisItems, slideId]);

  // Unlike single-shot kinds, a placement map may be re-sent until the round
  // locks (the backend forces maxSelections=0), so submitting never freezes
  // the surface — only the round moving to results does (`lockOnSubmit: false`).
  const {
    placements,
    heldItemId,
    submitted,
    canPlace,
    allPlaced,
    surfaceRef: planeRef,
    handleDragEnd,
    placeAt,
    nudge,
    toggleHold,
    liftItem,
    submit,
  } = useBoardPlacement({
    slideId,
    items,
    answerable: interactive && mode !== "results",
    lockOnSubmit: false,
    invertY: INVERT_Y,
    buildAnswer: (placed) => ({ answerType: "AxisAnswer", placements: placed }),
  });

  const showCounts = mode === "results" || mode === "liveResults";
  const totals = showCounts ? bucketTotals(optionCounts) : {};
  const highestTotal = Math.max(1, ...Object.values(totals));

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  const bank = items.filter((item) => !(item.id && placements[item.id]));

  const labelOf = (label: string | undefined): string => label?.trim() || "Item";
  const endpointOf = (label: string | undefined, fallback: string): string =>
    label?.trim() || fallback;

  // The item's AUTHORED position (pre-shuffle): the shuffled bank still shows
  // the number and color the editor's plane gave the item.
  const authoredIndexOf = (item: AxisItemView): number =>
    (axisItems ?? []).findIndex((authored) => authored.id === item.id);

  // The chip's whole look: the numbered disc in the item's color plus its
  // label, exactly as `AxisPlaneEditor` draws the authored marker. Unlike the
  // Grid / Place-on-Image item views, `AxisItemView` carries no authored color
  // override, so the palette default for the authored position is the color.
  const badgeOf = (item: AxisItemView) => {
    const index = authoredIndexOf(item);
    return (
      <MarkerBadge displayIndex={index + 1} color={paletteColorAt(index)} label={item.label} />
    );
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
          } as CSSProperties
        }
        aria-label={`${total.toString()} placements`}
      />
    );
  });

  return (
    <div className={styles.axisBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You placed everything on target ✓"
        wrongText="Not quite — some placements were off."
      />

      {/* DragDropProvider directly (not DragDropWrapper): the plane and the bank
          share one drag context so chips move freely between them. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.planeFrame}>
          <span className={styles.axisLabelYHigh}>{endpointOf(axis?.yHighLabel, "High")}</span>
          <div className={styles.planeRow}>
            <span className={styles.axisLabelX}>{endpointOf(axis?.xLowLabel, "Low")}</span>
            <PlacementSurface
              surfaceRef={planeRef}
              dropDisabled={!canPlace}
              className={[styles.plane, canPlace && heldItemId != null ? styles.planeArmed : ""]
                .filter(Boolean)
                .join(" ")}
            >
              {showCounts && heatCells}

              {/* The participant's own placed chips, one per item. */}
              {items.map((item) => {
                const itemId = item.id;
                const point = itemId ? placements[itemId] : undefined;
                if (!itemId || !point) return null;
                // The badge's own anchoring classes keep its DISC — the graded
                // point — on the coordinate, whichever shape the badge takes.
                const labeled = Boolean(item.label?.trim());
                return (
                  <DraggableChip
                    key={itemId}
                    itemId={itemId}
                    className={[
                      styles.placedChip,
                      markerStyles.anchored,
                      labeled ? markerStyles.anchoredLabeled : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                    accent={paletteColorAt(authoredIndexOf(item))}
                    disabled={!canPlace}
                    ariaLabel={`Pick ${labelOf(item.label)} back up (arrow keys nudge it)`}
                    style={toRenderStyle(point, INVERT_Y)}
                    onKeyDown={nudge(itemId)}
                    onClick={() => {
                      liftItem(itemId);
                    }}
                  >
                    {badgeOf(item)}
                  </DraggableChip>
                );
              })}

              {/* Full-plane tap target, shown only while an item is held — the
                  tap carries the placement coordinates (drag places without
                  it). */}
              {canPlace && heldItemId != null && (
                <button
                  type="button"
                  className={styles.placeTarget}
                  aria-label="Place on the plane"
                  onClick={placeAt}
                />
              )}
            </PlacementSurface>
            <span className={styles.axisLabelX}>{endpointOf(axis?.xHighLabel, "High")}</span>
          </div>
          <span className={styles.axisLabelYLow}>{endpointOf(axis?.yLowLabel, "Low")}</span>
        </div>

        {interactive && mode !== "results" && (
          <div className={styles.actions}>
            <BoardBank
              dropDisabled={!canPlace}
              emptyHint="All items placed."
              heldHint={heldItemId != null ? "Now tap the plane to place it." : null}
            >
              {bank.map((item) => (
                <DraggableChip
                  key={item.id}
                  itemId={item.id ?? ""}
                  className={[styles.bankChip, heldItemId === item.id ? styles.held : ""]
                    .filter(Boolean)
                    .join(" ")}
                  accent={paletteColorAt(authoredIndexOf(item))}
                  disabled={!canPlace}
                  // The badge's own label is the visible name; spelling it out
                  // here keeps an unlabeled item (a bare disc) nameable too.
                  ariaLabel={labelOf(item.label)}
                  ariaPressed={heldItemId === item.id}
                  onClick={() => {
                    toggleHold(item.id);
                  }}
                >
                  {badgeOf(item)}
                </DraggableChip>
              ))}
            </BoardBank>
            <BoardSubmitBar
              submitted={submitted}
              disabled={!allPlaced}
              onSubmit={submit}
              idleLabel="Submit answer"
              resubmitLabel="Update answer"
              submittedNote="Answer submitted ✓"
            />
          </div>
        )}
      </DragDropProvider>
    </div>
  );
};

export { AXIS_TALLY_BUCKETS, AxisBoardContent };
