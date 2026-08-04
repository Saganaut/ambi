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
// Every item's label / image / color travels on the participant-safe
// `placeOnImage.items`, while the answer key (its target point and the slide's
// tolerance) stays hidden until reveal. The reveal then carries geometry only,
// keyed by `itemId` — the board resolves each circle's number, color and label
// from the authored item that id names.
//
// Placement input — the drag / tap / arrow-key engine and the round-local draft
// it maintains — is `useBoardPlacement`, shared with the Axis board (the other
// continuous-surface board); this component owns only how the image, its scatter
// / revealed targets and the pins render. The map is one-shot — locking freezes
// the surface — so the hook takes `lockOnSubmit: true`.
//
// Coordinates are normalized [0, 1] in screen space over the image box —
// (0, 0) is the image's top-left, y NOT inverted — the same frame the editor's
// `PlaceOnImageSurface` and `RoundEvaluator.gradePlaceOnImage` work in. The
// draft placements and locked state are round-local, keyed off the slide id.
import { useMemo, type CSSProperties } from "react";
import { DragDropProvider } from "@dnd-kit/react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import type { PlaceItemView, SlideView } from "../../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../../resolveBoardStage";
import { AppImg } from "@components/Images/AppImg";
import { MarkerBadge } from "@ui/MarkerBadge/MarkerBadge";
import markerStyles from "@ui/MarkerBadge/MarkerBadge.module.css";
import { toRenderStyle } from "@utils/placementGeometry";
import type { BucketCoordinates } from "../answerTally";
import { PLACE_TALLY_BUCKETS, parseBucketKey, tallyTotalsByBucket } from "../answerTally";
import { BoardBank } from "../BoardBank/BoardBank";
import { BoardSubmitBar } from "../BoardSubmitBar/BoardSubmitBar";
import { DraggableChip } from "../DraggableChip/DraggableChip";
import { labelOrFallback } from "../itemLabels";
import { OutcomeBanner } from "../OutcomeBanner/OutcomeBanner";
import { PlacementSurface } from "../PlacementSurface/PlacementSurface";
import { seededShuffle } from "../seededShuffle";
import { useBoardPlacement } from "../useBoardPlacement";
import { findViewerOutcome } from "../viewerOutcome";
import styles from "./PlaceOnImageBoardContent.module.css";

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

/** One occupied tally bucket, decoded from an `itemId@bucketX,bucketY` key. */
interface ScatterDot extends BucketCoordinates {
  key: string;
  count: number;
}

/**
 * Collapse the live per-`itemId@bucketX,bucketY` tally onto the buckets
 * themselves, then decode each one into a density dot (dropping malformed
 * keys), so the scatter reads where pins landed across every item.
 */
const scatterDots = (optionCounts: Record<string, number>): ScatterDot[] => {
  const dots: ScatterDot[] = [];
  for (const [bucketKey, count] of Object.entries(tallyTotalsByBucket(optionCounts))) {
    const bucket = parseBucketKey(bucketKey);
    if (!bucket) continue;
    dots.push({ key: bucketKey, ...bucket, count });
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

  const { optionCounts, results, viewerParticipantId, placeTargets } =
    useLiveSessionQuery();

  // The bank is shuffled per round (seeded by the slide id so the order is
  // stable on this device all round); the authored order drives palette colors.
  const authoredItems = slide.placeOnImage?.items;
  const items = useMemo(
    () => seededShuffle(authoredItems ?? [], slideId),
    [authoredItems, slideId],
  );

  // The map is single-shot: locking it in freezes the surface for the rest of
  // the round (`lockOnSubmit: true`), unlike the re-submittable Axis plane.
  const {
    placements,
    heldItemId,
    submitted,
    canPlace,
    allPlaced,
    surfaceRef,
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
    lockOnSubmit: true,
    invertY: INVERT_Y,
    buildAnswer: (placed) => ({ answerType: "PlaceOnImageAnswer", placements: placed }),
  });

  const showScatter = mode === "results" || mode === "liveResults";
  const dots = showScatter ? scatterDots(optionCounts) : [];
  const maxCount = Math.max(1, ...dots.map((dot) => dot.count));

  // Revealed target circles: prefer the live event's copy for this slide, else
  // the snapshot seam (a client that joined mid-reveal — see the slice).
  const revealedTargets =
    mode === "results"
      ? ((results?.slideId === slideId ? results.placeTargets : placeTargets) ?? [])
      : [];

  // The viewer's own scored outcome, once results are revealed.
  const myOutcome =
    mode === "results" ? findViewerOutcome(results, slideId, viewerParticipantId) : undefined;

  // The id's 0-based position in the AUTHORED (pre-shuffle) item list — the
  // badge's display index and the shared palette default, so a pin's number
  // and color match its revealed target regardless of the bank's shuffle. One
  // definition for chips, pins and revealed circles alike; `-1` means the id
  // names no authored item.
  const authoredIndexOf = (itemId: string | undefined): number =>
    itemId == null ? -1 : (authoredItems ?? []).findIndex((authored) => authored.id === itemId);

  const accentOf = (item: PlaceItemView): string =>
    resolveDatumColor(item.color, authoredIndexOf(item.id));

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
          <AppImg
            className={styles.surfaceImage}
            src={imageUrl}
            alt=""
            draggable={false}
            fallbackSeed={slideId}
          />

          {/* Live density scatter: a dot at each occupied bucket's centre, its
              size and opacity scaled by the bucket's share of the busiest one. */}
          {dots.map((dot) => (
            <span
              key={dot.key}
              className={styles.scatterDot}
              style={
                {
                  left: `${(((dot.bucketX + 0.5) / PLACE_TALLY_BUCKETS) * 100).toString()}%`,
                  top: `${(((dot.bucketY + 0.5) / PLACE_TALLY_BUCKETS) * 100).toString()}%`,
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
          {revealedTargets.map((target) => {
            // Geometry is all the reveal carries: number, color and label come
            // from the authored item its `itemId` names, so a circle matches
            // its chip. A key naming no item draws nothing.
            const authoredIndex = authoredIndexOf(target.itemId);
            if (authoredIndex < 0) return null;
            const item = (authoredItems ?? [])[authoredIndex];
            const x = target.x ?? 0;
            const y = target.y ?? 0;
            const radius = target.radius ?? 0;
            const label = item.label?.trim() ?? "";
            const color = resolveDatumColor(item.color, authoredIndex);
            const position = toRenderStyle({ x, y }, INVERT_Y);
            return (
              <span
                key={target.itemId}
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
                  <MarkerBadge displayIndex={authoredIndex + 1} color={color} label={label} />
                </span>
              </span>
            );
          })}

          {/* The participant's own placed pins, one per item. */}
          {items.map((item) => {
            const itemId = item.id;
            const point = itemId ? placements[itemId] : undefined;
            if (!itemId || !point) return null;
            const itemName = labelOrFallback(item.label, "Item");
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
                ariaLabel={`Pick ${itemName} back up (arrow keys nudge it)`}
                style={toRenderStyle(point, INVERT_Y)}
                onKeyDown={nudge(itemId)}
                onClick={() => {
                  liftItem(itemId);
                }}>
                <MarkerBadge
                  displayIndex={authoredIndexOf(item.id) + 1}
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
            <BoardSubmitBar
              submitted={submitted}
              disabled={!allPlaced}
              onSubmit={submit}
              idleLabel='Lock in answer'
              submittedNote='Answer locked in ✓'>
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
                    ariaLabel={labelOrFallback(item.label, "Item")}
                    ariaPressed={heldItemId === item.id}
                    onClick={() => {
                      toggleHold(item.id);
                    }}>
                    <MarkerBadge
                      displayIndex={authoredIndexOf(item.id) + 1}
                      color={accentOf(item)}
                      label={item.label}
                    />
                  </DraggableChip>
                ))}
              </BoardBank>
            </BoardSubmitBar>
          </div>
        )}
      </DragDropProvider>
    </div>
  );
};

export { PlaceOnImageBoardContent };
