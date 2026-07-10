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
import { nanoid } from "nanoid";

import type { AppImage, Target } from "@deck/store/deckApi.gen";

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
interface PlacePoint {
  x: number;
  y: number;
}

/** A wire `Target` with its coordinate fields resolved for the UI. */
interface PlaceTargetView {
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

  /** ── Targets (addressed by array index — they carry no label) ─────────── */
  canAddTarget: boolean;
  /** Append a target at `point` (image centre by default). Immediate. */
  addTarget: (point?: PlacePoint) => void;
  /** Move a target to a clamped normalized point. Immediate. */
  moveTarget: (index: number, point: PlacePoint) => void;
  removeTarget: (index: number) => void;
  /** Debounced target label edit. */
  scheduleTargetLabel: (index: number, label: string) => void;
  /** Override the target's palette color (menu swatch / custom picker). Immediate. */
  setTargetColor: (index: number, color: string) => void;
  /** Set or clear (empty AppImage) the target's image. Immediate. */
  setTargetImage: (index: number, image: AppImage) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Set the shared tolerance radius (clamped to the 2–50 % bounds) on every
   * target. Immediate. */
  setTolerance: (value: number) => void;
}

/** Clamp to the normalized image box so a target can never leave [0, 1]. */
const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));

/** The one shared radius: first target's, else the default (wire fields are
 * optional, so a hand-authored target without a radius also falls back). */
const sharedTolerance = (targets: Target[]): number =>
  targets[0]?.radius ?? PLACE_TOLERANCE_DEFAULT;

const usePlaceOnImageEditor = (deckId: string, slideId: string): UsePlaceOnImageEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE");

  const slide = editor.slide;
  const content = slide?.content;
  const targets = content?.correctTargets ?? [];

  const question: PlaceOnImageQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        image: content?.image ?? { external: true },
        targets: targets.map((target, index) => ({
          id: target.id ?? `target-${index.toString()}`,
          x: target.x ?? 0.5,
          y: target.y ?? 0.5,
          label: target.label,
          image: target.image,
          color: target.color,
        })),
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
    editor.updateSlideContent((prev) => ({
      correctTargets: [
        ...prev.correctTargets,
        {
          id: nanoid(8),
          x: clamp01(point?.x ?? 0.5),
          y: clamp01(point?.y ?? 0.5),
          radius: sharedTolerance(prev.correctTargets),
        },
      ],
    }));
    editor.flush();
  };

  const moveTarget = (index: number, point: PlacePoint) => {
    editor.updateSlideContent((prev) => ({
      correctTargets: prev.correctTargets.map((target, i) =>
        i === index ? { ...target, x: clamp01(point.x), y: clamp01(point.y) } : target,
      ),
    }));
    editor.flush();
  };

  const removeTarget = (index: number) => {
    editor.updateSlideContent((prev) => ({
      correctTargets: prev.correctTargets.filter((_, i) => i !== index),
    }));
    editor.flush();
  };

  /** Merge a patch into one target; `flush` opts structural (menu) edits out
   *  of the debounce window, while label typing stays debounced. */
  const patchTarget = (index: number, patch: Partial<Target>, flush: boolean) => {
    editor.updateSlideContent((prev) => ({
      correctTargets: prev.correctTargets.map((target, i) =>
        i === index ? { ...target, ...patch } : target,
      ),
    }));
    if (flush) editor.flush();
  };

  const scheduleTargetLabel = (index: number, label: string) => {
    patchTarget(index, { label }, false);
  };

  const setTargetColor = (index: number, color: string) => {
    patchTarget(index, { color }, true);
  };

  const setTargetImage = (index: number, image: AppImage) => {
    patchTarget(index, { image }, true);
  };

  const setTolerance = (value: number) => {
    const clamped = Math.min(PLACE_TOLERANCE_MAX, Math.max(PLACE_TOLERANCE_MIN, value));
    editor.updateSlideContent((prev) => ({
      correctTargets: prev.correctTargets.map((target) => ({ ...target, radius: clamped })),
    }));
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    setImage,
    canAddTarget,
    addTarget,
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
