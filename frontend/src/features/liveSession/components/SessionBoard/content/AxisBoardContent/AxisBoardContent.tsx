// Axis (free-form 2D placement) presentation + answer surface for the board.
// One component covers every moment, switched by `mode`:
//   - prompt      → place one chip per authored item anywhere on the plane;
//                   Submit posts the whole placement map (AxisAnswer) and may be
//                   re-sent until the round locks (the backend forces
//                   maxSelections=0, last write wins).
//   - liveResults → a translucent heat overlay aggregated from the
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
// The plane wears the same chrome the editor's `AxisPlaneEditor` draws — a
// bordered square quartered by two centre lines, with the four endpoint labels
// overlaid as pills inside its edges — so an author recognises their own plane
// on the board. Board and editor implement their views separately, sharing only
// primitives, so that chrome is restated here rather than pushed into the
// (deliberately chrome-free) shared `PlacementSurface`.
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
import { PLACEMENT_TALLY_BUCKETS, parseBucketKey, tallyTotalsByBucket } from "../answerTally";
import { BoardBank } from "../BoardBank/BoardBank";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { DraggableChip } from "../DraggableChip/DraggableChip";
import { labelOrFallback } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { PlacementSurface } from "../PlacementSurface/PlacementSurface";
import { seededShuffle } from "../seededShuffle";
import { useBoardPlacement } from "../useBoardPlacement";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./AxisBoardContent.module.css";

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
  const totals = showCounts ? tallyTotalsByBucket(optionCounts) : {};
  const highestTotal = Math.max(1, ...Object.values(totals));

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  const bank = items.filter((item) => !(item.id && placements[item.id]));

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

  // One endpoint label, overlaid as a read-only pill inside the plane's edge —
  // the same four-corner-free layout the editor's `AxisPlaneEditor` draws (Y
  // high/low top/bottom, X low/high left/right), minus the editing affordance.
  // The pills are inert (`pointer-events: none` in CSS), so one never swallows
  // a placement tap or a chip drop.
  const endpointLabel = (edgeClass: string, text: string) => (
    <span className={[styles.endpointOverlay, edgeClass].join(" ")}>
      <span className={styles.endpointPill}>{text}</span>
    </span>
  );

  // Only non-empty buckets render, so the heat layer stays a handful of nodes
  // rather than a hundred.
  const heatCells = Object.entries(totals).map(([bucketKey, total]) => {
    const bucket = parseBucketKey(bucketKey);
    if (!bucket) return null;
    const { bucketX, bucketY } = bucket;
    return (
      <span
        key={bucketKey}
        className={styles.heatCell}
        style={
          {
            left: `${((bucketX / PLACEMENT_TALLY_BUCKETS) * 100).toString()}%`,
            top: `${((1 - (bucketY + 1) / PLACEMENT_TALLY_BUCKETS) * 100).toString()}%`,
            width: `${(100 / PLACEMENT_TALLY_BUCKETS).toString()}%`,
            height: `${(100 / PLACEMENT_TALLY_BUCKETS).toString()}%`,
            "--heat": total / highestTotal,
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
          <PlacementSurface
            surfaceRef={planeRef}
            dropDisabled={!canPlace}
            className={[styles.plane, canPlace && heldItemId != null ? styles.planeArmed : ""]
              .filter(Boolean)
              .join(" ")}
          >
            {/* The quartering centre lines, first so every overlay above paints
                over them. Decoration only — the axes' meaning is the labels'. */}
            <span className={styles.planeAxisLineX} aria-hidden="true" />
            <span className={styles.planeAxisLineY} aria-hidden="true" />

            {endpointLabel(styles.endpointTop, labelOrFallback(axis?.yHighLabel, "High"))}
            {endpointLabel(styles.endpointBottom, labelOrFallback(axis?.yLowLabel, "Low"))}
            {endpointLabel(styles.endpointLeft, labelOrFallback(axis?.xLowLabel, "Low"))}
            {endpointLabel(styles.endpointRight, labelOrFallback(axis?.xHighLabel, "High"))}

            {showCounts && heatCells}

            {/* The participant's own placed chips, one per item. */}
            {items.map((item) => {
              const itemId = item.id;
              const point = itemId ? placements[itemId] : undefined;
              if (!itemId || !point) return null;
              // The badge's own anchoring classes keep its DISC — the graded
              // point — on the coordinate, whichever shape the badge takes.
              const labeled = Boolean(item.label?.trim());
              const itemName = labelOrFallback(item.label, "Item");
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
                  ariaLabel={`Pick ${itemName} back up (arrow keys nudge it)`}
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
                  ariaLabel={labelOrFallback(item.label, "Item")}
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

export { AxisBoardContent };
