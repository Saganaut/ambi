// PlaceOnImage-specific editing layer for the deck editor's Place-on-Image
// slide.
//
// Sits on the generic `useSlideEditor<"PLACE_ON_IMAGE">` and exposes the
// intent-level surface the Place-on-Image author UI consumes: a synthesized
// `question` view, a prompt edit, the backing-image swap, and per-target ops.
// There is exactly ONE `useSlideEditor` instance per Place-on-Image slide
// (this hook is instantiated once, in `PlaceOnImageSlideContent`), so every
// write funnels through a single draft + debounce buffer.
//
// A PLACE_ON_IMAGE slide is Axis's sibling: players pin a point on the
// backing image instead of a labeled plane, so the normalized [0, 1]
// coordinate space is pure plumbing — no endpoint labels, no item bank.
// Coordinates are screen-space over the image box: (0, 0) is the image's
// top-left corner (unlike Axis, whose y is inverted); the player runtime must
// measure in the same space. Targets (`correctTargets`) are circles with
// optional author annotations — label, color override, image (Axis's item
// fields) — and each carries its own normalized `radius` on the wire; the
// editor keeps the radii in lockstep as ONE tolerance knob (Axis's
// slide-level `tolerance`), so the view derives `tolerance` from the first
// target and `setTolerance` rewrites every radius. Grading is INSIDE_RADIUS
// (the pin lands inside any target circle) and the grader implements nothing
// else, so `scoreMode` has no authoring knob — `buildDefaultContent` fixes it
// and the editor never writes it.
//
// Targets are addressed by id (Axis's item ops), never by array position: the
// UI holds an id across renders, an index goes stale the moment a row is
// removed. `correctTargets` is a list rather than Axis's id-keyed map, so each
// write resolves the id back to an index — inside the updater, against the
// freshest draft — and a key that matches nothing is a no-op. Targets minted
// before ids existed on the wire are given one by the load-time backfill
// (`useItemIdentityBackfill`), so addressing is pure id with no positional
// fallback anywhere.
//
// Target identity — id AND color — is likewise a stored fact, minted at
// creation and repaired on load. Nothing here derives either from a target's
// position, so reordering the rows renumbers the markers without moving or
// repainting them (their coordinates were always their own).
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";
import { nanoid } from "nanoid";

import { nextPaletteColor } from "@/shared/components/Charts/optionPalette";
import type { AppImage, Target } from "@deck/store/deckApi.gen";

import type { NormalizedPoint } from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { clamp01 } from "../utils/placement";
import { useItemIdentityBackfill } from "./useItemIdentityBackfill";
import { useSlideEditor } from "./useSlideEditor";

/** Cap the pin targets where the shared 6-color option palette runs out, so
 * every marker keeps a distinct hue (and single-digit index), matching Axis. */
const MAX_PLACE_TARGETS = 6;
/** Tolerance is a normalized radius: 2 % of the image at the tightest … */
const PLACE_TOLERANCE_MIN = 0.02;
/** … up to half the image (an almost-anything-goes region). */
const PLACE_TOLERANCE_MAX = 0.5;
/** Default tolerance for a slide with no targets yet (first `addTarget`). */
const PLACE_TOLERANCE_DEFAULT = 0.1;
/** `maxLength` for target label inputs (mirrors `AXIS_LABEL_MAX`). */
const PLACE_LABEL_MAX = 80;

/** A normalized point on the image, screen-space: (0, 0) is the top-left. */
type PlacePoint = NormalizedPoint;

/** A wire `Target` with its coordinate fields resolved for the UI. */
interface PlaceTargetView {
  /** The target's address — its wire id, guaranteed by the load-time backfill. */
  id: string;
  x: number;
  y: number;
  label?: string;
  image?: AppImage;
  /** Authored color override; the palette default applies when absent. */
  color?: string;
}

/** Flattened, UI-facing view of the active Place-on-Image slide. */
interface PlaceOnImageQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** The backing image players pin on (blank external placeholder until set). */
  image: AppImage;
  /** Correct target circles, in authored order (marker index = row index). */
  targets: PlaceTargetView[];
  /** The one normalized radius shared by every target circle. */
  tolerance: number;
}

interface UsePlaceOnImageEditorResult {
  /** The active slide as a flat view, or undefined until one is selected. */
  question: PlaceOnImageQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
  /** Swap the backing image (gallery pick / URL). Immediate. */
  setImage: (image: AppImage) => void;

  /** ── Targets (keyed by `PlaceTargetView.id`) ──────────────────────────── */
  canAddTarget: boolean;
  canRemove: boolean;

  /** Append a target at `point` (image centre by default). Immediate. */
  addTarget: (point?: PlacePoint) => void;
  /** Commit a row drop — reorders `correctTargets`. Immediate. */
  handleItemDragEnd: (event: DragEndEvent) => void;
  /** Move a target to a clamped normalized point. Immediate. */
  moveTarget: (targetId: string, point: PlacePoint) => void;
  removeTarget: (targetId: string) => void;
  /** Debounced target label edit. */
  scheduleTargetLabel: (targetId: string, label: string) => void;
  /** Override the target's palette color (menu swatch / custom picker). Immediate. */
  setTargetColor: (targetId: string, color: string) => void;
  /** Set or clear (empty AppImage) the target's image. Immediate. */
  setTargetImage: (targetId: string, image: AppImage) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Set the shared tolerance radius (clamped to the 2–50 % bounds) on every
   * target. Immediate. */
  setTolerance: (value: number) => void;
}

/** Where the addressed target sits in the list, or -1 when it addresses none
 * (a stale id from a row the author has since removed). */
const indexOfTarget = (targets: Target[], targetId: string): number =>
  targets.findIndex((target) => target.id === targetId);

/** The one shared radius: first target's, else the default (wire fields are
 * optional, so a hand-authored target without a radius also falls back). */
const sharedTolerance = (targets: Target[]): number =>
  targets[0]?.radius ?? PLACE_TOLERANCE_DEFAULT;

const usePlaceOnImageEditor = (deckId: string, slideId: string): UsePlaceOnImageEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE");

  const slide = editor.slide;
  const content = slide?.content;
  const targets = content?.correctTargets ?? [];

  // Freeze legacy targets' ids and colors into the content once, on load.
  useItemIdentityBackfill(slideId, content?.correctTargets, (backfilled) => {
    editor.updateSlideContent({ correctTargets: backfilled });
    editor.flush();
  });

  const question: PlaceOnImageQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        image: content?.image ?? { external: true },
        // An id-less target is unaddressable — no row op and no marker drag
        // could reach it — so it is withheld rather than rendered inert. The
        // backfill above mints its id on the very next render.
        targets: targets.flatMap((target) =>
          target.id == null
            ? []
            : [
                {
                  id: target.id,
                  x: target.x ?? 0.5,
                  y: target.y ?? 0.5,
                  label: target.label,
                  image: target.image,
                  color: target.color,
                },
              ],
        ),
        tolerance: sharedTolerance(targets),
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const setImage = (image: AppImage) => {
    editor.updateSlideContent({ image });
    editor.flush();
  };

  const canAddTarget = targets.length < MAX_PLACE_TARGETS;

  const addTarget = (point?: PlacePoint) => {
    if (!canAddTarget) return;
    // Both id and color are picked against the freshest draft, so two adds
    // inside one debounce window can't collide on either.
    editor.updateSlideContent((prev) => ({
      correctTargets: [
        ...prev.correctTargets,
        {
          id: nanoid(8),
          color: nextPaletteColor(prev.correctTargets.map((target) => target.color)),
          x: clamp01(point?.x ?? 0.5),
          y: clamp01(point?.y ?? 0.5),
          radius: sharedTolerance(prev.correctTargets),
        },
      ],
    }));
    editor.flush();
  };

  /** Reorder the targets on a row drop (mirrors `useAxisEditor`). Positional
   *  rather than id-addressed on purpose: the drop only ever states "the row
   *  at this position moved to that one". It moves display order alone — each
   *  target owns its coordinates and its color, so the markers keep their
   *  place and their hue and only their numbers change. */
  const handleItemDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    editor.updateSlideContent((prev) => {
      const next = prev.correctTargets.slice();
      const [moved] = next.splice(initialIndex, 1);
      next.splice(index, 0, moved);
      return { correctTargets: next };
    });
    editor.flush();
  };

  /** Merge a patch into the addressed target; `flush` opts structural (menu)
   *  edits out of the debounce window, while label typing stays debounced.
   *  The id resolves against the updater's own `prev`, so back-to-back writes
   *  inside one debounce window address the freshest list. */
  const patchTarget = (targetId: string, patch: Partial<Target>, flush: boolean) => {
    editor.updateSlideContent((prev) => {
      const index = indexOfTarget(prev.correctTargets, targetId);
      if (index === -1) return {};
      return {
        correctTargets: prev.correctTargets.map((target, i) =>
          i === index ? { ...target, ...patch } : target,
        ),
      };
    });
    if (flush) editor.flush();
  };

  const moveTarget = (targetId: string, point: PlacePoint) => {
    patchTarget(targetId, { x: clamp01(point.x), y: clamp01(point.y) }, true);
  };

  const removeTarget = (targetId: string) => {
    editor.updateSlideContent((prev) => {
      const index = indexOfTarget(prev.correctTargets, targetId);
      if (index === -1) return {};
      return { correctTargets: prev.correctTargets.filter((_, i) => i !== index) };
    });
    editor.flush();
  };

  const scheduleTargetLabel = (targetId: string, label: string) => {
    patchTarget(targetId, { label }, false);
  };

  const setTargetColor = (targetId: string, color: string) => {
    patchTarget(targetId, { color }, true);
  };

  const setTargetImage = (targetId: string, image: AppImage) => {
    patchTarget(targetId, { image }, true);
  };

  const setTolerance = (value: number) => {
    const clamped = Math.min(PLACE_TOLERANCE_MAX, Math.max(PLACE_TOLERANCE_MIN, value));
    editor.updateSlideContent((prev) => ({
      correctTargets: prev.correctTargets.map((target) => ({ ...target, radius: clamped })),
    }));
    editor.flush();
  };

  return {
    canRemove: targets.length > 1,
    question,
    schedulePrompt,
    flush: editor.flush,
    setImage,
    canAddTarget,
    addTarget,
    handleItemDragEnd,
    moveTarget,
    removeTarget,
    scheduleTargetLabel,
    setTargetColor,
    setTargetImage,
    setTolerance,
  };
};

export {
  MAX_PLACE_TARGETS,
  PLACE_LABEL_MAX,
  PLACE_TOLERANCE_DEFAULT,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
};
export type { PlaceOnImageQuestionView, PlacePoint, PlaceTargetView, UsePlaceOnImageEditorResult };
