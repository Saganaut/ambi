// PlaceOnImage-specific editing layer for the deck editor's Place-on-Image
// slide.
//

import type { DragEndEvent } from "@dnd-kit/react";

import type { AppImage, PlacePoint } from "@deck/store/deckApi.gen";

import { clamp01 } from "../utils/placement";
import { buildDefaultPlaceItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

/** A slide with no targets has nothing to pin, so the last row keeps its
 * place: `canRemove` is false at the floor. */
const MIN_PLACE_TARGETS = 1;
/** Cap the pin targets where the shared 6-color option palette runs out, so
 * every marker keeps a distinct hue (and single-digit index), matching Axis. */
const MAX_PLACE_TARGETS = 6;
/** Tolerance is a normalized radius: 2 % of the image at the tightest … */
const PLACE_TOLERANCE_MIN = 0.02;
/** … up to half the image (an almost-anything-goes region). */
const PLACE_TOLERANCE_MAX = 0.5;
/** Default tolerance for a new slide (also set by `buildDefaultContent`). */
const PLACE_TOLERANCE_DEFAULT = 0.1;
/** `maxLength` for target label inputs (mirrors `AXIS_LABEL_MAX`). */
const PLACE_LABEL_MAX = 80;

/** An item with its answer-key point folded in for the UI. */
interface PlaceItemView {
  /** The item's address — its wire id, guaranteed by the load-time backfill. */
  id: string;
  label?: string;
  image?: AppImage;
  /** Authored color override; the palette default applies when absent. */
  color?: string;
  /** The item's target point, absent while it carries no answer-key entry. */
  x?: number;
  y?: number;
}

/** Whether the item carries an answer-key point — i.e. is graded at all. A
 *  predicate rather than a plain boolean so a placed target's coordinates read
 *  as the numbers they are at the call site. */
const isPlaced = (target: PlaceItemView): target is PlaceItemView & PlacePoint =>
  target.x != null && target.y != null;

/** Flattened, UI-facing view of the active Place-on-Image slide. */
interface PlaceOnImageQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** The backing image players pin on (blank external placeholder until set). */
  image: AppImage;
  /** The items to place, in authored order (marker index = row index). */
  targets: PlaceItemView[];
  /** Normalized radius around each target that counts as correct. */
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

  /** ── Targets (keyed by `PlaceItemView.id`) ───────────────────────────── */
  canAddTarget: boolean;
  canRemove: boolean;

  /** Append an item. With `point`, it is born placed there (a press on open
   * image); with none, it is born UNPLACED — a target that exists but keys
   * no right answer, and so is not graded. Immediate. */
  addTarget: (point?: PlacePoint) => void;
  /** Commit a row drop — reorders `items`. Immediate. */
  handleItemDragEnd: (event: DragEndEvent) => void;
  /** Assign (clamped normalized point) or clear (null) the item's target.
   * A stale id is inert — no entry is ever minted for a phantom item. */
  setTargetPosition: (targetId: string, point: PlacePoint | null) => void;
  /** Remove the item and its target-position assignment. */
  removeTarget: (targetId: string) => void;
  /** Debounced item label edit. */
  scheduleTargetLabel: (targetId: string, label: string) => void;
  /** Override the item's palette color (menu swatch / custom picker). Immediate. */
  setTargetColor: (targetId: string, color: string) => void;
  /** Set or clear (empty AppImage) the item's image. Immediate. */
  setTargetImage: (targetId: string, image: AppImage) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Set the per-slide tolerance radius (clamped to the 2–50 % bounds). Immediate. */
  setTolerance: (value: number) => void;
}

const usePlaceOnImageEditor = (deckId: string, slideId: string): UsePlaceOnImageEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE");

  const slide = editor.slide;
  const content = slide?.content;

  // The bank of items — bounded add/remove, drag-reorder, the per-row label,
  // color and image edits, and the load-time identity backfill — over this
  // slide's one editor. Removing an item drops its target in the same write.
  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items }),
    buildItem: buildDefaultPlaceItem,
    minItems: MIN_PLACE_TARGETS,
    maxItems: MAX_PLACE_TARGETS,
    onRemoveItem: (prev, targetId) => {
      const { [targetId]: _dropped, ...rest } = prev.correctPositions;
      return { correctPositions: rest };
    },
  });

  const question: PlaceOnImageQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        image: content?.image ?? { external: true },
        // The spread folds in the item's answer-key point when it has one, and
        // leaves x/y absent when it does not.
        targets: bank.items.map((item) => ({ ...item, ...content?.correctPositions[item.id] })),
        tolerance: content?.tolerance ?? PLACE_TOLERANCE_DEFAULT,
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const setImage = (image: AppImage) => {
    editor.updateSlideContent({ image });
    editor.flush();
  };

  /** Mint an item, and its answer-key entry with it when the gesture carried a
   *  point (a press on the open image places what it creates). No point = no
   *  right answer: the item joins the bank unkeyed and the grader passes over
   *  it (an entirely unkeyed slide is collect-only). */
  const addTarget = (point?: PlacePoint) => {
    bank.addItem(
      point == null
        ? undefined
        : (item, prev) => ({
            correctPositions: {
              ...prev.correctPositions,
              [item.id]: { x: clamp01(point.x), y: clamp01(point.y) },
            },
          }),
    );
  };

  /** Give the item a target point, or take it away again (null) — the row's
   *  "Set target"/"Clear target" affordance and every marker drag land here.
   *  A marker id is the only thing a drag carries, so the item is resolved
   *  against the freshest draft first: a stale id must be inert rather than
   *  mint an answer-key entry for nothing. */
  const setTargetPosition = (targetId: string, point: PlacePoint | null) => {
    editor.updateSlideContent((prev) => {
      if (!prev.items.some((item) => item.id === targetId)) return {};
      if (point == null) {
        const { [targetId]: _dropped, ...rest } = prev.correctPositions;
        return { correctPositions: rest };
      }
      return {
        correctPositions: {
          ...prev.correctPositions,
          [targetId]: { x: clamp01(point.x), y: clamp01(point.y) },
        },
      };
    });
    editor.flush();
  };

  const setTolerance = (value: number) => {
    const clamped = Math.min(PLACE_TOLERANCE_MAX, Math.max(PLACE_TOLERANCE_MIN, value));
    editor.updateSlideContent({ tolerance: clamped });
    editor.flush();
  };

  return {
    canRemove: bank.canRemove,
    question,
    schedulePrompt,
    flush: editor.flush,
    setImage,
    canAddTarget: bank.canAdd,
    addTarget,
    handleItemDragEnd: bank.handleItemDragEnd,
    setTargetPosition,
    removeTarget: bank.removeItem,
    scheduleTargetLabel: bank.scheduleItemLabel,
    setTargetColor: bank.setItemColor,
    setTargetImage: bank.setItemImage,
    setTolerance,
  };
};

export {
  isPlaced,
  MAX_PLACE_TARGETS,
  MIN_PLACE_TARGETS,
  PLACE_LABEL_MAX,
  PLACE_TOLERANCE_DEFAULT,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
};
export type { PlaceItemView, PlaceOnImageQuestionView, UsePlaceOnImageEditorResult };
