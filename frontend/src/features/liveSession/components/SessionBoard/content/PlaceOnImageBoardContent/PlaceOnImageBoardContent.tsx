// Place-on-Image presentation + answer surface for the board. One component
// covers every moment, switched by `mode`:
//   - prompt      → place one pin per authored item onto the backing image;
//                   "Lock in answer" posts the whole placement map
//                   (PlaceOnImageAnswer {itemId → {x, y}}) and freezes.
//   - liveResults → a density scatter aggregated from the quantized
//                   `itemId@bx,by` tally keys fills in over the image; a
//                   participant who hasn't locked in may still place pins.
//   - results     → the scatter stays visible and the authored target circles
//                   are disclosed (their normalized radius drawn as the exact
//                   ellipse the grader accepts), plus the viewer's own outcome.
//
// Each authored target is an item to place: its label / image / color travel on
// the participant-safe `placeOnImage.items`, while its location and radius (the
// answer key) stay hidden until reveal. Item i's pin is graded against target
// i's own circle.
//
// Placement has two layered inputs, mirroring the Grid board. Pointer/touch DRAG
// is the primary path (drag a bank chip onto the image to drop its pin at the
// pointer, drag a placed pin to move it or back to the bank to un-place),
// resolved through the shared `resolveDragEnd` seam plus the drop pointer
// position. Tap-to-place is the small-screen / keyboard / AT fallback: tap a
// bank chip to hold it, then tap the image to drop its pin; arrow keys nudge a
// focused placed pin. The two never conflict — dnd-kit's pointer sensor only
// starts a drag past a movement/hold threshold, so a plain click still toggles
// the held state.
//
// Coordinates are normalized [0, 1] in screen space over the image box —
// (0, 0) is the image's top-left, y NOT inverted — the same frame the editor's
// `PlaceOnImageSurface` and `RoundEvaluator.gradePlaceOnImage` work in. The
// draft placements and locked state are round-local, keyed off the slide id.
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { PlaceItemView, PlacePoint, SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import markerStyles from "@ui/MarkerBadge/MarkerBadge.module.css";
import { BANK_DROPPABLE_ID, resolveDragEnd } from "@utils/dragDrop";
import { clampPoint, normalizeToBox, toRenderStyle } from "@utils/placementGeometry";
import { BoardBank } from "../BoardBank/BoardBank";
import { DraggableChip } from "../DraggableChip/DraggableChip";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { PlacementSurface, SURFACE_DROPPABLE_ID } from "../PlacementSurface/PlacementSurface";
import { seededShuffle } from "../seededShuffle";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./PlaceOnImageBoardContent.module.css";

/**
 * Bucket count per axis of the live tally's quantization grid. Manual mirror of
 * the backend's `AnswerTallyKeys.PLACE_TALLY_BUCKETS` (it is not a request-DTO
 * bound, so it does not flow through codegen — the same keep-in-sync discipline
 * as `AXIS_TALLY_BUCKETS` in the Axis board).
 */
const PLACE_TALLY_BUCKETS = 20;

/** Arrow-key nudge step for a focused placed pin, in normalized units. */
const KEYBOARD_NUDGE_STEP = 0.02;

/**
 * The image's orientation, handed to the shared geometry at every call site:
 * (0, 0) is the image's top-left, like the browser measures, so screen y never
 * inverts (unlike the Axis plane's).
 */
const INVERT_Y = false;

interface PlaceOnImageBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** One occupied tally bucket, decoded from an `itemId@bx,by` key. */
interface ScatterDot {
  key: string;
  bx: number;
  by: number;
  count: number;
}

/**
 * Sum the live per-`itemId@bucketX,bucketY` tally into per-bucket density dots
 * (dropping empty / malformed keys) — the item-prefix-split analogue of the
 * Axis board's `bucketTotals`, so the scatter reads where pins landed across
 * every item.
 */
const scatterDots = (optionCounts: Record<string, number>): ScatterDot[] => {
  const totals: Record<string, number> = {};
  for (const [key, count] of Object.entries(optionCounts)) {
    if (count <= 0) continue;
    const bucket = key.split("@")[1];
    if (!bucket) continue;
    totals[bucket] = (totals[bucket] ?? 0) + count;
  }
  const dots: ScatterDot[] = [];
  for (const [bucket, count] of Object.entries(totals)) {
    const [bx, by] = bucket.split(",").map(Number);
    if (!Number.isInteger(bx) || !Number.isInteger(by)) continue;
    dots.push({ key: bucket, bx, by, count });
  }
  return dots;
};

const PlaceOnImageBoardContent = ({
  slide,
  mode,
  interactive,
}: PlaceOnImageBoardContentProps) => {
  const slideId = slide.id ?? "";
  const imageUrl = slide.placeOnImage?.imageUrl ?? null;

  const { sendAnswer } = useSessionConnection();
  const { optionCounts, results, viewerParticipantId, placeTargets } =
    useLiveSessionQuery();

  // The bank is shuffled per round (seeded by the slide id so the order is
  // stable on this device all round); the authored order drives palette colors.
  const authoredItems = slide.placeOnImage?.items;
  const items = useMemo(
    () => seededShuffle(authoredItems ?? [], slideId),
    [authoredItems, slideId],
  );

  const surfaceRef = useRef<HTMLDivElement | null>(null);

  // Round-local placement draft: itemId → normalized point. Cleared when the
  // round (slide) changes.
  const [placements, setPlacements] = useState<Record<string, PlacePoint>>({});
  const [heldItemId, setHeldItemId] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setPlacements({});
    setHeldItemId(null);
    setSubmitted(false);
  }, [slideId]);

  const canPlace = interactive && !submitted && mode !== "results";
  const allPlaced =
    items.length > 0 && items.every((item) => item.id && placements[item.id]);

  const submit = () => {
    if (!canPlace || !allPlaced) return;
    sendAnswer(slideId, { answerType: "PlaceOnImageAnswer", placements });
    setSubmitted(true);
  };

  // Resolve a drag onto the image (place / move at the drop pointer) or onto the
  // bank (un-place), no-op'ing a drop with no coordinate. The drop coordinate
  // comes from dnd-kit's live pointer position, not the discrete droppable id.
  const handleDragEnd = (event: DragEndEvent) => {
    const drop = resolveDragEnd(event);
    if (!drop || !canPlace) return;
    const { itemId, targetId } = drop;
    // An id-less item renders with an empty draggable id (PlaceItemView.id is
    // optional); never let that key into the placement map.
    if (!itemId) return;
    if (targetId === BANK_DROPPABLE_ID) {
      if (!placements[itemId]) return;
      setPlacements((prev) => {
        const { [itemId]: _lifted, ...rest } = prev;
        return rest;
      });
    } else if (targetId === SURFACE_DROPPABLE_ID) {
      const pointer = event.operation.position.current;
      const point = normalizeToBox(
        surfaceRef.current?.getBoundingClientRect(),
        pointer.x,
        pointer.y,
        INVERT_Y,
      );
      if (!point) return;
      setPlacements((prev) => ({ ...prev, [itemId]: point }));
    }
    if (heldItemId === itemId) setHeldItemId(null);
  };

  // Tap fallback: with an item held, tapping the image drops its pin at the tap.
  const placeAt = (event: React.MouseEvent<HTMLElement>) => {
    if (!canPlace || heldItemId == null) return;
    const point = normalizeToBox(
      surfaceRef.current?.getBoundingClientRect(),
      event.clientX,
      event.clientY,
      INVERT_Y,
    );
    if (!point) return;
    setPlacements((prev) => ({ ...prev, [heldItemId]: point }));
    setHeldItemId(null);
  };

  const nudge = (itemId: string) => (event: React.KeyboardEvent) => {
    if (!canPlace) return;
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-KEYBOARD_NUDGE_STEP, 0],
      ArrowRight: [KEYBOARD_NUDGE_STEP, 0],
      // Top-left origin: ArrowUp decreases y, ArrowDown increases it.
      ArrowUp: [0, -KEYBOARD_NUDGE_STEP],
      ArrowDown: [0, KEYBOARD_NUDGE_STEP],
    };
    const delta = deltas[event.key];
    if (!delta) return;
    event.preventDefault();
    setPlacements((prev) => {
      const current = prev[itemId];
      if (!current) return prev;
      return {
        ...prev,
        [itemId]: clampPoint({ x: current.x + delta[0], y: current.y + delta[1] }),
      };
    });
  };

  const showScatter = mode === "results" || mode === "liveResults";
  const dots = showScatter ? scatterDots(optionCounts) : [];
  const maxCount = Math.max(1, ...dots.map((d) => d.count));

  // Revealed target circles: prefer the live event's copy for this slide, else
  // the snapshot seam (a client that joined mid-reveal — see the slice).
  const revealedTargets =
    mode === "results"
      ? ((results?.slideId === slideId ? results.placeTargets : placeTargets) ?? [])
      : [];

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  // The item's 0-based position in the AUTHORED (pre-shuffle) item list — the
  // badge's display index and the shared palette default, so a pin's number
  // and color match its revealed target regardless of the bank's shuffle.
  const authoredIndexOf = (item: PlaceItemView): number =>
    (authoredItems ?? []).findIndex((authored) => authored.id === item.id);

  const accentOf = (item: PlaceItemView): string =>
    resolveDatumColor(item.color, authoredIndexOf(item));

  const labelOf = (label: string | undefined): string => label?.trim() || "Item";

  // A pin/pill shape as soon as a label joins the disc — MarkerBadge decides
  // this internally too, but the wrapper needs to know in order to offset
  // itself so the DISC (not the pill) lands on the placement point.
  const isPillItem = (item: PlaceItemView): boolean => Boolean(item.label?.trim());

  const bank = items.filter((item) => !(item.id && placements[item.id]));

  if (!imageUrl) {
    return (
      <div className={styles.placeOnImageBoardContent}>
        <p className={styles.empty}>No image was set for this slide.</p>
      </div>
    );
  }

  return (
    <div className={styles.placeOnImageBoardContent}>
      <OutcomeBanner
        outcome={myOutcome}
        correctText="You placed everything on target ✓"
        wrongText="Not quite — some pins missed the mark."
      />

      {/* DragDropProvider directly (not DragDropWrapper): the image and the bank
          share one drag context so chips move freely between them. */}
      <DragDropProvider onDragEnd={handleDragEnd}>
        <PlacementSurface
          surfaceRef={surfaceRef}
          dropDisabled={!canPlace}
          className={[
            styles.surface,
            canPlace && heldItemId != null ? styles.surfaceArmed : "",
          ]
            .filter(Boolean)
            .join(" ")}>
          {/* The img is the box: block-level, full width, intrinsic ratio
              height, so the normalized overlay coordinates land where the grader
              measures. */}
          <img className={styles.surfaceImage} src={imageUrl} alt="" draggable={false} />

          {/* Live density scatter: a dot at each occupied bucket's centre, its
              size and opacity scaled by the bucket's share of the busiest one. */}
          {dots.map((dot) => (
            <span
              key={dot.key}
              className={styles.scatterDot}
              style={
                {
                  left: `${(((dot.bx + 0.5) / PLACE_TALLY_BUCKETS) * 100).toString()}%`,
                  top: `${(((dot.by + 0.5) / PLACE_TALLY_BUCKETS) * 100).toString()}%`,
                  "--dot-share": dot.count / maxCount,
                } as CSSProperties
              }
              aria-label={`${dot.count.toString()} pins`}
            />
          ))}

          {/* Revealed target circles: centre at (x, y), width/height = radius*2
              as the same percentage of the (non-square) box, so it renders as
              the exact ellipse the normalized-distance grader accepts. Each
              target's own marker is a non-interactive MarkerBadge, matching the
              editor's placed markers; the wrapper offsets a labeled badge so
              its DISC — not the pill — lands on the target centre. */}
          {revealedTargets.map((target, index) => {
            const x = target.x ?? 0;
            const y = target.y ?? 0;
            const radius = target.radius ?? 0;
            const label = target.label?.trim() ?? "";
            const color = resolveDatumColor(target.color, index);
            const position = toRenderStyle({ x, y }, INVERT_Y);
            return (
              <span
                key={target.id ?? `target-${index.toString()}`}
                className={styles.targetGroup}
                style={{ "--target-color": color } as CSSProperties}>
                <span
                  className={styles.targetRegion}
                  style={{
                    ...position,
                    width: `${(radius * 2 * 100).toString()}%`,
                    height: `${(radius * 2 * 100).toString()}%`,
                  }}
                  aria-hidden="true"
                />
                <span
                  className={[
                    styles.targetMarker,
                    markerStyles.anchored,
                    label ? markerStyles.anchoredLabeled : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  style={position}>
                  <MarkerBadge displayIndex={index + 1} color={color} label={label} />
                </span>
              </span>
            );
          })}

          {/* The participant's own placed pins, one per item. */}
          {items.map((item) => {
            const itemId = item.id;
            const point = itemId ? placements[itemId] : undefined;
            if (!itemId || !point) return null;
            return (
              <DraggableChip
                key={itemId}
                itemId={itemId}
                className={[
                  styles.placedPin,
                  markerStyles.anchored,
                  isPillItem(item) ? markerStyles.anchoredLabeled : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                accent={accentOf(item)}
                disabled={!canPlace}
                ariaLabel={`Pick ${labelOf(item.label)} back up (arrow keys nudge it)`}
                style={toRenderStyle(point, INVERT_Y)}
                onKeyDown={nudge(itemId)}
                onClick={() => {
                  if (!canPlace) return;
                  setPlacements((prev) => {
                    const { [itemId]: _lifted, ...rest } = prev;
                    return rest;
                  });
                  setHeldItemId(itemId);
                }}>
                <MarkerBadge
                  displayIndex={authoredIndexOf(item) + 1}
                  color={accentOf(item)}
                  label={item.label}
                />
              </DraggableChip>
            );
          })}

          {/* Full-image tap target, shown only while an item is held — the tap
              carries the placement coordinates (drag places without it). */}
          {canPlace && heldItemId != null && (
            <button
              type='button'
              className={styles.placeTarget}
              aria-label='Place on the image'
              onClick={placeAt}
            />
          )}
        </PlacementSurface>

        {interactive && mode !== "results" && (
          <div className={styles.actions}>
            {submitted ? (
              <p className={styles.submitted}>Answer locked in ✓</p>
            ) : (
              <>
                <BoardBank
                  dropDisabled={!canPlace}
                  emptyHint="All items placed."
                  heldHint={heldItemId != null ? "Now tap the image to place it." : null}>
                  {bank.map((item) => (
                    <DraggableChip
                      key={item.id}
                      itemId={item.id ?? ""}
                      className={[styles.bankChip, heldItemId === item.id ? styles.held : ""]
                        .filter(Boolean)
                        .join(" ")}
                      accent={accentOf(item)}
                      disabled={!canPlace}
                      ariaLabel={labelOf(item.label)}
                      ariaPressed={heldItemId === item.id}
                      onClick={() => {
                        setHeldItemId((prev) => (prev === item.id ? null : (item.id ?? null)));
                      }}>
                      <MarkerBadge
                        displayIndex={authoredIndexOf(item) + 1}
                        color={accentOf(item)}
                        label={item.label}
                      />
                    </DraggableChip>
                  ))}
                </BoardBank>
                <Btn size='sm' variant='brand' disabled={!allPlaced} onClick={submit}>
                  Lock in answer
                </Btn>
              </>
            )}
          </div>
        )}
      </DragDropProvider>
    </div>
  );
};

export { PLACE_TALLY_BUCKETS, PlaceOnImageBoardContent };
