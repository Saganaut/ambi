import type { DragEndEvent } from "@dnd-kit/react";

import type { AppImage, ScaleItem } from "@deck/store/deckApi.gen";

import type { Identified } from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { buildDefaultScaleItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

/** A scale needs at least one statement to rate … */
const MIN_SCALE_STATEMENTS = 1;
/** … and is capped so the author's list (and the player's screen) stays sane. */
const MAX_SCALE_STATEMENTS = 6;
/** Tolerance is bounded as a fraction of the span (max − min): 2 % at the tightest … */
const SCALES_TOLERANCE_MIN_FRACTION = 0.02;
/** … up to half the track (an almost-anything-goes margin). */
const SCALES_TOLERANCE_MAX_FRACTION = 0.5;
/** Default fraction for a new slide (`buildDefaultContent` bakes it in scale units). */
const SCALES_TOLERANCE_DEFAULT_FRACTION = 0.1;
/** `maxLength` for statement label inputs (item-row parity across kinds). */
const SCALES_STATEMENT_LABEL_MAX = 80;

/** Keep a scale-unit tolerance within the fraction bounds of the given span. */
const clampTolerance = (value: number, span: number): number =>
  Math.min(
    SCALES_TOLERANCE_MAX_FRACTION * span,
    Math.max(SCALES_TOLERANCE_MIN_FRACTION * span, value),
  );

/** Flattened, UI-facing view of the active Scales slide. */
interface ScalesQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  min: number;
  max: number;
  leftLabel: string;
  rightLabel: string;
  /** ± margin in scale units around each target that still counts as correct. */
  tolerance: number;
  /** The statements, every one carrying the id its target is keyed by. */
  items: Identified<ScaleItem>[];
  /** statementId → target value; empty means the slide is unscored. */
  correctValues: Record<string, number>;
  /** True when any statement has a target — i.e. the slide is graded. */
  scored: boolean;
}

interface UseScalesEditorResult {
  /** The active Scales slide as a flat view, or undefined until one is selected. */
  question: ScalesQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
  /** Debounced scale-field edits (bind change → schedule, blur → flush).
   *  Endpoint edits re-clamp the stored tolerance against the new span. */
  scheduleMin: (value: number) => void;
  scheduleMax: (value: number) => void;
  scheduleLeftLabel: (value: string) => void;
  scheduleRightLabel: (value: string) => void;

  /** ── Statements (keyed by `item.id`) ─────────────────────────────────── */
  /** True while under {@link MAX_SCALE_STATEMENTS}. */
  canAddStatement: boolean;
  /** Append a blank statement in the next free palette color (no-op at the max). */
  addStatement: () => void;
  /** True while above {@link MIN_SCALE_STATEMENTS} — same for every statement. */
  canRemove: boolean;
  /** Debounced statement label edit. */
  scheduleStatementLabel: (statementId: string | undefined, label: string) => void;
  /** Override the statement's palette color (menu swatch / custom picker). Immediate. */
  setStatementColor: (statementId: string | undefined, color: string) => void;
  /** Set or clear the statement's participant-visible image. Immediate. */
  setStatementImage: (statementId: string | undefined, image: AppImage) => void;
  /** Remove a statement and drop its target from `correctValues`. */
  removeStatement: (statementId: string | undefined) => void;
  /** @dnd-kit drop handler — reorders display order; writes stay keyed by id. */
  handleStatementDragEnd: (event: DragEndEvent) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Debounced per-statement target edit → `correctValues[id]`. */
  scheduleCorrectAnswerValue: (statementId: string | undefined, value: number) => void;
  /** Immediate per-statement target set (a drag release on the statement's track). */
  commitCorrectAnswerValue: (statementId: string | undefined, value: number) => void;
  /** Drop one statement's target, leaving that statement unscored. */
  clearCorrectAnswerValue: (statementId: string | undefined) => void;
  /** Set the per-slide tolerance in scale units (clamped to the fraction bounds). Immediate. */
  setTolerance: (value: number) => void;
}

const useScalesEditor = (deckId: string, slideId: string): UseScalesEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "SCALES");

  // `editor.slide` is already narrowed to the SCALES slide (its `content` is the
  // SCALES arm of the `SlideContent` union): passing `"SCALES"` makes the hook
  // runtime-guard on `content.contentType`, so a non-scales slide reads back as
  // `undefined` rather than being asserted into the wrong type.
  const slide = editor.slide;
  const content = slide?.content;
  const correctValues = content?.correctValues ?? {};

  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items }),
    buildItem: buildDefaultScaleItem,
    minItems: MIN_SCALE_STATEMENTS,
    maxItems: MAX_SCALE_STATEMENTS,
    // Drop the statement's target too, so a stale key can't keep the slide
    // "scored" against a statement the author deleted.
    onRemoveItem: (prev, statementId) => {
      const { [statementId]: _removed, ...rest } = prev.correctValues;
      return { correctValues: rest };
    },
  });

  const question: ScalesQuestionView | undefined =
    slide && content
      ? {
          id: slide.id,
          prompt: slide.title,
          min: content.min,
          max: content.max,
          leftLabel: content.leftLabel,
          rightLabel: content.rightLabel,
          tolerance: content.tolerance,
          items: bank.items,
          correctValues,
          scored: Object.keys(correctValues).length > 0,
        }
      : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  // Endpoint edits change the span, so they re-clamp the stored tolerance in
  // the same commit — the function form derives both from the freshest pending
  // draft.
  const scheduleMin = (value: number) =>
    editor.updateSlideContent((prev) => ({
      min: value,
      tolerance: clampTolerance(prev.tolerance, prev.max - value),
    }));
  const scheduleMax = (value: number) =>
    editor.updateSlideContent((prev) => ({
      max: value,
      tolerance: clampTolerance(prev.tolerance, value - prev.min),
    }));
  const scheduleLeftLabel = (value: string) => editor.updateSlideContent({ leftLabel: value });
  const scheduleRightLabel = (value: string) => editor.updateSlideContent({ rightLabel: value });

  const addStatement = () => {
    bank.addItem();
  };

  const scheduleCorrectAnswerValue = (id: string | undefined, value: number) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctValues: { ...prev.correctValues, [id]: value },
    }));
  };

  const commitCorrectAnswerValue = (id: string | undefined, value: number) => {
    if (!id) return;
    scheduleCorrectAnswerValue(id, value);
    editor.flush();
  };

  const clearCorrectAnswerValue = (id: string | undefined) => {
    if (!id) return;
    editor.updateSlideContent((prev) => {
      const { [id]: _removed, ...rest } = prev.correctValues;
      return { correctValues: rest };
    });
    editor.flush();
  };

  const setTolerance = (value: number) => {
    editor.updateSlideContent((prev) => ({
      tolerance: clampTolerance(value, prev.max - prev.min),
    }));
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    scheduleMin,
    scheduleMax,
    scheduleLeftLabel,
    scheduleRightLabel,
    canAddStatement: bank.canAdd,
    addStatement,
    canRemove: bank.canRemove,
    scheduleStatementLabel: bank.scheduleItemLabel,
    setStatementColor: bank.setItemColor,
    setStatementImage: bank.setItemImage,
    removeStatement: bank.removeItem,
    handleStatementDragEnd: bank.handleItemDragEnd,
    scheduleCorrectAnswerValue,
    commitCorrectAnswerValue,
    clearCorrectAnswerValue,
    setTolerance,
  };
};

export {
  MAX_SCALE_STATEMENTS,
  MIN_SCALE_STATEMENTS,
  SCALES_STATEMENT_LABEL_MAX,
  SCALES_TOLERANCE_DEFAULT_FRACTION,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
};
export type { ScalesQuestionView, UseScalesEditorResult };
