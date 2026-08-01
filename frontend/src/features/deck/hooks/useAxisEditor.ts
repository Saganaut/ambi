// Axis-specific editing layer for the deck editor's Axis slide.
//
// Sits on the generic `useSlideEditor<"AXIS">` and exposes the intent-level
// surface the Axis author UI consumes: a synthesized `question` view, a prompt
// edit, endpoint-label ops, and the target/tolerance ops only Axis has. The
// item-bank ops are `useItemBankEditor`'s, composed over this hook's editor —
// there is exactly ONE `useSlideEditor` instance per Axis slide (this hook is
// instantiated once, in `AxisSlideContent`), so every write funnels through a
// single draft + debounce buffer.
//
// An AXIS slide is a free-form 2D placement: an X × Y plane with low/high
// endpoint labels per axis, a bank of items, and `correctPositions` mapping
// each item id to its normalized target point. Structural edits keep that map
// consistent: removing an item drops its target. The axes themselves are fixed
// (no add/remove-lane analogue of grid's `remapAfterRemoval`). Grading is
// INSIDE_RADIUS (every keyed item within `tolerance` of its target), so
// `scoreMode` has no authoring knob — `buildDefaultContent` fixes it and the
// editor never writes it.
import type { DragEndEvent } from "@dnd-kit/react";

import type { AppImage, AxisItem, AxisPoint } from "@deck/store/deckApi.gen";

import type { Identified } from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { clamp01 } from "../utils/placement";
import { buildDefaultAxisItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

/** At least one item to place … */
const MIN_AXIS_ITEMS = 1;
/** … and few enough that every item gets a distinct color from the shared
 * 6-color option palette (and the bank stays scannable). */
const MAX_AXIS_ITEMS = 6;
/** Tolerance is a normalized radius: 2 % of the plane at the tightest … */
const AXIS_TOLERANCE_MIN = 0.02;
/** … up to half the plane (an almost-anything-goes region). */
const AXIS_TOLERANCE_MAX = 0.5;
/** Default tolerance for a new slide (also set by `buildDefaultContent`). */
const AXIS_TOLERANCE_DEFAULT = 0.1;
/** `maxLength` for endpoint and item label inputs. */
const AXIS_LABEL_MAX = 80;

/** Which plane axis an endpoint-label op addresses. */
type AxisAxis = "x" | "y";
/** Which end of the axis: low = 0, high = 1. */
type AxisEnd = "low" | "high";

/** Flattened, UI-facing view of the active Axis slide. */
interface AxisQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  xLowLabel: string;
  xHighLabel: string;
  yLowLabel: string;
  yHighLabel: string;
  /** The bank, every item carrying the id its target is keyed by. */
  items: Identified<AxisItem>[];
  /** Target point per item id, normalized to [0, 1] on both axes. */
  correctPositions: Record<string, AxisPoint>;
  /** Normalized radius around each target that counts as correct. */
  tolerance: number;
}

interface UseAxisEditorResult {
  /** The active Axis slide as a flat view, or undefined until one is selected. */
  question: AxisQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;

  /** ── Axis endpoint labels ────────────────────────────────────────────── */
  /** Debounced endpoint-label edit (e.g. `("x", "low", "Weak")`). */
  scheduleAxisLabel: (axis: AxisAxis, end: AxisEnd, text: string) => void;

  /** ── Items (keyed by `item.id`) ──────────────────────────────────────── */
  canAddItem: boolean;
  canRemoveItem: boolean;
  addItem: () => void;
  /** Remove the item and its target-position assignment. */
  removeItem: (itemId: string | undefined) => void;
  /** Debounced item label edit. */
  scheduleItemLabel: (itemId: string | undefined, label: string) => void;
  /** Override the item's palette color (menu swatch / custom picker). Immediate. */
  setItemColor: (itemId: string | undefined, color: string) => void;
  /** Set or clear (empty AppImage) the item's image. Immediate. */
  setItemImage: (itemId: string | undefined, image: AppImage) => void;
  /** @dnd-kit drop handler for the item list (bank display order only). */
  handleItemDragEnd: (event: DragEndEvent) => void;
  /** Assign (normalized point) or clear (null) the item's target. Immediate. */
  setTargetPosition: (itemId: string | undefined, point: AxisPoint | null) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Set the per-slide tolerance radius (clamped to the 2–50 % bounds). Immediate. */
  setTolerance: (value: number) => void;
}

const useAxisEditor = (deckId: string, slideId: string): UseAxisEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "AXIS");

  const slide = editor.slide;
  const content = slide?.content;

  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items }),
    buildItem: buildDefaultAxisItem,
    minItems: MIN_AXIS_ITEMS,
    maxItems: MAX_AXIS_ITEMS,
    onRemoveItem: (prev, itemId) => {
      const { [itemId]: _dropped, ...rest } = prev.correctPositions;
      return { correctPositions: rest };
    },
  });

  const labelField = (axis: AxisAxis, end: AxisEnd) =>
    axis === "x"
      ? end === "low"
        ? ("xLowLabel" as const)
        : ("xHighLabel" as const)
      : end === "low"
        ? ("yLowLabel" as const)
        : ("yHighLabel" as const);

  const question: AxisQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        xLowLabel: content?.xLowLabel ?? "",
        xHighLabel: content?.xHighLabel ?? "",
        yLowLabel: content?.yLowLabel ?? "",
        yHighLabel: content?.yHighLabel ?? "",
        items: bank.items,
        correctPositions: content?.correctPositions ?? {},
        tolerance: content?.tolerance ?? AXIS_TOLERANCE_DEFAULT,
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const scheduleAxisLabel = (axis: AxisAxis, end: AxisEnd, text: string) => {
    editor.updateSlideContent({ [labelField(axis, end)]: text });
  };

  const setTargetPosition = (itemId: string | undefined, point: AxisPoint | null) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      if (point == null) {
        const { [itemId]: _dropped, ...rest } = prev.correctPositions;
        return { correctPositions: rest };
      }
      return {
        correctPositions: {
          ...prev.correctPositions,
          [itemId]: { x: clamp01(point.x), y: clamp01(point.y) },
        },
      };
    });
    editor.flush();
  };

  const setTolerance = (value: number) => {
    const clamped = Math.min(AXIS_TOLERANCE_MAX, Math.max(AXIS_TOLERANCE_MIN, value));
    editor.updateSlideContent({ tolerance: clamped });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    scheduleAxisLabel,
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    // Wrapped, not passed through: the public `addItem` takes no arguments —
    // Axis has no born-placed add, so the bank's `withNewItem` stays internal.
    addItem: () => {
      bank.addItem();
    },
    removeItem: bank.removeItem,
    scheduleItemLabel: bank.scheduleItemLabel,
    setItemColor: bank.setItemColor,
    setItemImage: bank.setItemImage,
    handleItemDragEnd: bank.handleItemDragEnd,
    setTargetPosition,
    setTolerance,
  };
};

export {
  AXIS_LABEL_MAX,
  AXIS_TOLERANCE_DEFAULT,
  AXIS_TOLERANCE_MAX,
  AXIS_TOLERANCE_MIN,
  MAX_AXIS_ITEMS,
  MIN_AXIS_ITEMS,
  useAxisEditor,
};
export type { AxisAxis, AxisEnd, AxisQuestionView, UseAxisEditorResult };
