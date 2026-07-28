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
// Placement has two layered inputs, mirroring the Place-on-Image board — the
// other continuous-surface board. Pointer/touch DRAG is the primary path (drag a
// bank chip onto the plane to drop it at the pointer, drag a placed chip to move
// it or back to the bank to un-place), resolved through the shared
// `resolveDragEnd` seam plus the drop pointer position. Tap-to-place is the
// small-screen / keyboard / AT fallback: tap a bank chip to hold it, then tap
// the plane to drop it at the tap; arrow keys nudge a focused placed chip. The
// two never conflict — dnd-kit's pointer sensor only starts a drag past a
// movement/hold threshold, so a plain click still toggles the held state.
//
// Coordinates are normalized [0, 1] with (0, 0) the low/low corner — bottom-left
// as rendered — so screen y inverts on the way in and back out again on render,
// the same frame the editor's `AxisPlaneEditor` and the grader work in. The
// draft placements are round-local, keyed off the slide id.
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import {
  DragDropProvider,
  useDraggable,
  useDroppable,
  type DragEndEvent,
} from "@dnd-kit/react";

import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { AxisItemView, AxisPoint, SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "@utils/dragDrop";
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

/**
 * Reserved droppable id for the plane. Item ids are backend-minted UUIDs and
 * the bank uses its own comma-free sentinel, so this sentinel can never collide
 * with either.
 */
const SURFACE_DROPPABLE_ID = "plane";

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

/**
 * An item chip that is both a plain button (tap flow) and a whole-body drag
 * source (drag flow), mirroring the Place-on-Image board's chip. A quick click
 * never crosses the pointer sensor's activation threshold, so `onClick` keeps
 * toggling the held / pick-up state. The chip's look is entirely the
 * `MarkerBadge` it wraps; this button adds position, interactivity and state.
 */
interface ChipProps {
  itemId: string;
  className: string;
  accent: string;
  disabled: boolean;
  ariaLabel?: string;
  ariaPressed?: boolean;
  style?: CSSProperties;
  onClick: () => void;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  children: ReactNode;
}
const DraggableChip = ({
  itemId,
  className,
  accent,
  disabled,
  ariaLabel,
  ariaPressed,
  style,
  onClick,
  onKeyDown,
  children,
}: ChipProps) => {
  const { ref, isDragging } = useDraggable({ id: itemId, disabled });
  return (
    <button
      ref={ref}
      type='button'
      className={[className, isDragging ? styles.dragging : ""].filter(Boolean).join(" ")}
      style={{ "--chip-accent": accent, ...style } as CSSProperties}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-pressed={ariaPressed}
      onClick={onClick}
      onKeyDown={onKeyDown}>
      {children}
    </button>
  );
};

const AxisBoardContent = ({ slide, mode, interactive }: AxisBoardContentProps) => {
  const slideId = slide.id ?? "";
  const axis = slide.axis;

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId } = useLiveSessionQuery();

  // The bank is shuffled per round, seeded by the slide id so the order is
  // stable on this device all round; the authored order drives the numbers and
  // the palette colors.
  const axisItems = axis?.items;
  const items = useMemo(
    () => seededShuffle(axisItems ?? [], slideId),
    [axisItems, slideId],
  );

  const planeRef = useRef<HTMLDivElement | null>(null);

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

  /** Normalized plane point for a client position ((0, 0) = bottom-left). */
  const pointFromClient = (clientX: number, clientY: number): AxisPoint | null => {
    const rect = planeRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    // (0,0) is the low/low corner — bottom-left as rendered — so screen y inverts.
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01(1 - (clientY - rect.top) / rect.height),
    };
  };

  // Resolve a drag onto the plane (place / move at the drop pointer) or onto the
  // bank (un-place), no-op'ing a drop with no coordinate. The drop coordinate
  // comes from dnd-kit's live pointer position, not the discrete droppable id.
  const handleDragEnd = (event: DragEndEvent) => {
    const drop = resolveDragEnd(event);
    if (!drop || !canPlace) return;
    const { itemId, targetId } = drop;
    // An id-less item renders with an empty draggable id (AxisItemView.id is
    // optional); never let that key into the placement map — the tap flow
    // guards the same way.
    if (!itemId) return;
    if (targetId === BANK_DROPPABLE_ID) {
      if (!placements[itemId]) return;
      setPlacements((prev) => {
        const { [itemId]: _lifted, ...rest } = prev;
        return rest;
      });
    } else if (targetId === SURFACE_DROPPABLE_ID) {
      const pointer = event.operation.position.current;
      const point = pointFromClient(pointer.x, pointer.y);
      if (!point) return;
      setPlacements((prev) => ({ ...prev, [itemId]: point }));
    }
    if (heldItemId === itemId) setHeldItemId(null);
  };

  // Tap fallback: with an item held, tapping the plane drops it at the tap.
  const placeAt = (event: React.MouseEvent<HTMLElement>) => {
    if (!canPlace || heldItemId == null) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    setPlacements((prev) => ({ ...prev, [heldItemId]: point }));
    setHeldItemId(null);
  };

  const nudge = (itemId: string) => (event: React.KeyboardEvent) => {
    if (!canPlace) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-KEYBOARD_NUDGE_STEP, 0],
      ArrowRight: [KEYBOARD_NUDGE_STEP, 0],
      // Bottom-left origin: ArrowUp increases y, ArrowDown decreases it.
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
      {myOutcome && (
        <p className={myOutcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
          {myOutcome.correct
            ? "You placed everything on target ✓"
            : "Not quite — some placements were off."}
        </p>
      )}

      {/* DragDropProvider directly (not DragDropWrapper): the plane and the bank
          share one drag context so chips move freely between them. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <div className={styles.planeFrame}>
          <span className={styles.axisLabelYHigh}>{endpointOf(axis?.yHighLabel, "High")}</span>
          <div className={styles.planeRow}>
            <span className={styles.axisLabelX}>{endpointOf(axis?.xLowLabel, "Low")}</span>
            <PlaneSurface
              planeRef={planeRef}
              armed={canPlace && heldItemId != null}
              dropDisabled={!canPlace}>
              {showCounts && heatCells}

              {/* The participant's own placed chips, one per item. */}
              {items.map((item) => {
                const itemId = item.id;
                const point = itemId ? placements[itemId] : undefined;
                if (!itemId || !point) return null;
                // A labeled badge is a pill, so the marker shifts left by the
                // badge's published edge-to-disc-centre distance to keep the
                // DISC — the graded point — on the coordinate.
                const labeled = Boolean(item.label?.trim());
                return (
                  <DraggableChip
                    key={itemId}
                    itemId={itemId}
                    className={[styles.placedChip, labeled ? styles.placedChipLabeled : ""]
                      .filter(Boolean)
                      .join(" ")}
                    accent={paletteColorAt(authoredIndexOf(item))}
                    disabled={!canPlace}
                    ariaLabel={`Pick ${labelOf(item.label)} back up (arrow keys nudge it)`}
                    style={{
                      left: `${(point.x * 100).toString()}%`,
                      top: `${((1 - point.y) * 100).toString()}%`,
                    }}
                    onKeyDown={nudge(itemId)}
                    onClick={() => {
                      if (!canPlace) return;
                      setPlacements((prev) => {
                        const { [itemId]: _lifted, ...rest } = prev;
                        return rest;
                      });
                      setHeldItemId(itemId);
                    }}>
                    {badgeOf(item)}
                  </DraggableChip>
                );
              })}

              {/* Full-plane tap target, shown only while an item is held — the
                  tap carries the placement coordinates (drag places without
                  it). */}
              {canPlace && heldItemId != null && (
                <button
                  type='button'
                  className={styles.placeTarget}
                  aria-label='Place on the plane'
                  onClick={placeAt}
                />
              )}
            </PlaneSurface>
            <span className={styles.axisLabelX}>{endpointOf(axis?.xHighLabel, "High")}</span>
          </div>
          <span className={styles.axisLabelYLow}>{endpointOf(axis?.yLowLabel, "Low")}</span>
        </div>

        {interactive && mode !== "results" && (
          <div className={styles.actions}>
            <BoardBank dropDisabled={!canPlace}>
              {bank.length === 0 ? (
                <span className={styles.hint}>All items placed.</span>
              ) : (
                bank.map((item) => (
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
                      setHeldItemId((prev) => (prev === item.id ? null : (item.id ?? null)));
                    }}>
                    {badgeOf(item)}
                  </DraggableChip>
                ))
              )}
              {heldItemId != null && (
                <span className={styles.hint}>Now tap the plane to place it.</span>
              )}
            </BoardBank>
            {submitted && <p className={styles.submittedNote}>Answer submitted ✓</p>}
            <Btn size='sm' variant='brand' disabled={!allPlaced} onClick={submit}>
              {submitted ? "Update answer" : "Submit answer"}
            </Btn>
          </div>
        )}
      </DragDropProvider>
    </div>
  );
};

/**
 * The plane as a drop target: a chip dragged here lands at the pointer. Owns the
 * droppable frame and the live drop-highlight; the heat overlay, placed chips
 * and tap target come in as children. The forwarded {@link planeRef} measures
 * the box for normalized coordinates. Dropping is disabled outside the
 * answerable moments.
 */
interface PlaneSurfaceProps {
  planeRef: React.MutableRefObject<HTMLDivElement | null>;
  armed: boolean;
  dropDisabled: boolean;
  children: ReactNode;
}
const PlaneSurface = ({ planeRef, armed, dropDisabled, children }: PlaneSurfaceProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: SURFACE_DROPPABLE_ID,
    disabled: dropDisabled,
  });
  return (
    <div
      ref={(element) => {
        planeRef.current = element;
        ref(element);
      }}
      className={[
        styles.plane,
        armed ? styles.planeArmed : "",
        isDropTarget ? styles.planeDropTarget : "",
      ]
        .filter(Boolean)
        .join(" ")}>
      {children}
    </div>
  );
};

/**
 * The item bank as a drop target: a placed chip dragged here is un-placed. Uses
 * the reserved {@link BANK_DROPPABLE_ID} sentinel.
 */
interface BoardBankProps {
  dropDisabled: boolean;
  children: ReactNode;
}
const BoardBank = ({ dropDisabled, children }: BoardBankProps) => {
  const { ref, isDropTarget } = useDroppable({
    id: BANK_DROPPABLE_ID,
    disabled: dropDisabled,
  });
  return (
    <div
      ref={ref}
      className={[styles.bank, isDropTarget ? styles.bankDropTarget : ""]
        .filter(Boolean)
        .join(" ")}>
      {children}
    </div>
  );
};

export { AXIS_TALLY_BUCKETS, AxisBoardContent };
