// Place-on-Image presentation + answer surface for the board. A single
// component covers every moment, switched by `mode`:
//   - prompt      → a participant drops a single pin on the backing image
//                   (press to place, drag to move); "Lock in answer" posts one
//                   PlaceOnImageAnswer {x, y} and freezes the pin. Host/projector
//                   just sees the image (no pins until the tally goes live).
//   - liveResults → a density scatter aggregated from the quantized `"bx,by"`
//                   tally keys fills in over the image; a participant who hasn't
//                   locked in yet may still place their pin.
//   - results     → the scatter stays visible and the authored target circles
//                   are disclosed (their normalized tolerance drawn as the exact
//                   ellipse the grader accepts), plus the viewer's own outcome.
//
// Coordinates are normalized [0, 1] in screen space over the image box —
// (0, 0) is the image's top-left, y NOT inverted — the same frame the editor's
// `PlaceOnImageSurface` and `RoundEvaluator.gradePlaceOnImage` work in. The
// draft pin and locked state are round-local, keyed off the slide id.
import { useEffect, useRef, useState } from "react";

import { resolveDatumColor } from "@/shared/components/Charts/optionPalette";
import { useLiveSessionQuery } from "@/features/liveSession/hooks/useLiveSessionQuery";
import { useSessionConnection } from "@/features/liveSession/views/SessionPage/SessionConnectionContext";
import type { SlideView } from "../../../store/liveSessionApi.gen";
import type { BoardQuestionMode } from "../resolveBoardStage";
import { Btn } from "@ui/Buttons/Btn";
import styles from "./PlaceOnImageBoardContent.module.css";

/**
 * Bucket count per axis of the live tally's quantization grid. Manual mirror of
 * the backend's `AnswerTallyKeys.PLACE_TALLY_BUCKETS` (it is not a request-DTO
 * bound, so it does not flow through codegen — the same keep-in-sync discipline
 * as `AXIS_TALLY_BUCKETS` in the Axis board).
 */
const PLACE_TALLY_BUCKETS = 20;

interface PlaceOnImageBoardContentProps {
  slide: SlideView;
  mode: BoardQuestionMode;
  interactive: boolean;
}

/** A normalized [0, 1] point over the image box (top-left origin). */
interface PlacePoint {
  x: number;
  y: number;
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** One occupied tally bucket, decoded from a `"bx,by"` key. */
interface ScatterDot {
  key: string;
  bx: number;
  by: number;
  count: number;
}

/** Decode the occupied `"bx,by"` tally buckets (dropping empty / malformed keys). */
const scatterDots = (optionCounts: Record<string, number>): ScatterDot[] => {
  const dots: ScatterDot[] = [];
  for (const [key, count] of Object.entries(optionCounts)) {
    if (count <= 0) continue;
    const [bx, by] = key.split(",").map(Number);
    if (!Number.isInteger(bx) || !Number.isInteger(by)) continue;
    dots.push({ key, bx, by, count });
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

  const surfaceRef = useRef<HTMLDivElement>(null);

  // Round-local draft pin + locked state. Cleared when the round (slide) changes.
  const [draft, setDraft] = useState<PlacePoint | null>(null);
  const [submitted, setSubmitted] = useState(false);
  useEffect(() => {
    setDraft(null);
    setSubmitted(false);
  }, [slideId]);

  const canPlace = interactive && !submitted && mode !== "results";

  /** Normalized image-box point for a client position (top-left origin). */
  const pointFromClient = (clientX: number, clientY: number): PlacePoint | null => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return null;
    return {
      x: clamp01((clientX - rect.left) / rect.width),
      y: clamp01((clientY - rect.top) / rect.height),
    };
  };

  // Press to drop the pin at the pointer and keep following it; a new press
  // simply relocates the single pin. Committed only on "Lock in answer".
  const handlePointerDown = (event: React.PointerEvent) => {
    if (!canPlace || !imageUrl) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (!point) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraft(point);
  };

  const handlePointerMove = (event: React.PointerEvent) => {
    if (!canPlace || !event.currentTarget.hasPointerCapture(event.pointerId)) return;
    const point = pointFromClient(event.clientX, event.clientY);
    if (point) setDraft(point);
  };

  const submit = () => {
    if (!canPlace || !draft) return;
    sendAnswer(slideId, { answerType: "PlaceOnImageAnswer", x: draft.x, y: draft.y });
    setSubmitted(true);
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
    mode === "results" && results?.slideId === slideId
      ? results.outcomes.find((o) => o.participantId === viewerParticipantId)
      : undefined;

  if (!imageUrl) {
    return (
      <div className={styles.placeOnImageBoardContent}>
        <p className={styles.empty}>No image was set for this slide.</p>
      </div>
    );
  }

  return (
    <div className={styles.placeOnImageBoardContent}>
      {myOutcome && (
        <p className={myOutcome.correct ? styles.outcomeCorrect : styles.outcomeWrong}>
          {myOutcome.correct
            ? "Your pin landed on target ✓"
            : "Not quite — your pin missed the mark."}
        </p>
      )}

      {/* Pointer placement surface. The pin is dropped and dragged directly on
          the image; there is no discrete keyboard placement (a continuous point
          on an arbitrary image has no meaningful step), matching the editor's
          direct-placement surface. */}
      <div
        ref={surfaceRef}
        className={[styles.surface, canPlace ? styles.surfaceArmed : ""]
          .filter(Boolean)
          .join(" ")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}>
        {/* The img is the box: block-level, full width, intrinsic ratio height,
            so the normalized overlay coordinates land where the grader measures. */}
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
              } as React.CSSProperties
            }
            aria-label={`${dot.count.toString()} pins`}
          />
        ))}

        {/* Revealed target circles: centre at (x, y), width/height = radius*2 as
            the same percentage of the (non-square) box, so it renders as the
            exact ellipse the normalized-distance grader accepts. */}
        {revealedTargets.map((target, index) => {
          const x = target.x ?? 0;
          const y = target.y ?? 0;
          const radius = target.radius ?? 0;
          const label = target.label?.trim() ?? "";
          const color = resolveDatumColor(target.color, index);
          const position = {
            left: `${(x * 100).toString()}%`,
            top: `${(y * 100).toString()}%`,
          };
          return (
            <span
              key={target.id ?? `target-${index.toString()}`}
              className={styles.targetGroup}
              style={{ "--target-color": color } as React.CSSProperties}>
              <span
                className={styles.targetRegion}
                style={{
                  ...position,
                  width: `${(radius * 2 * 100).toString()}%`,
                  height: `${(radius * 2 * 100).toString()}%`,
                }}
                aria-hidden="true"
              />
              {label ? (
                <span className={styles.targetLabel} style={position}>
                  {label}
                </span>
              ) : (
                <span className={styles.targetDot} style={position} aria-hidden="true" />
              )}
            </span>
          );
        })}

        {/* The participant's own draft / locked pin. */}
        {draft && (
          <span
            className={styles.pin}
            style={{
              left: `${(draft.x * 100).toString()}%`,
              top: `${(draft.y * 100).toString()}%`,
            }}
            aria-label={submitted ? "Your locked-in pin" : "Your pin"}
          />
        )}
      </div>

      {interactive && mode !== "results" && (
        <div className={styles.actions}>
          {submitted ? (
            <p className={styles.submitted}>Answer locked in ✓</p>
          ) : (
            <>
              <span className={styles.hint}>
                {draft ? "Drag to adjust, then lock it in." : "Tap the image to place your pin."}
              </span>
              <Btn size="sm" variant="brand" disabled={!draft} onClick={submit}>
                Lock in answer
              </Btn>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { PLACE_TALLY_BUCKETS, PlaceOnImageBoardContent };
