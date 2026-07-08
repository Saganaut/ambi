// Scales-specific editing layer for the deck editor's Scales (Likert) slide.
//
// Sits on the generic `useSlideEditor<"SCALES">` and exposes the intent-level
// surface the Scales author UI consumes: a synthesized `question` view, a
// prompt edit, the scale-level fields (min / max / anchor labels / tolerance),
// and per-statement ops keyed by statement id. There is exactly ONE
// `useSlideEditor` instance per Scales slide (this hook is instantiated once,
// in `ScalesSlideContent`), so every write — the prompt, the scale settings,
// each statement's label and target — funnels through a single draft + debounce
// buffer.
//
// The scale is continuous: players drag a marker anywhere along the track, so
// grading needs a positive tolerance (an exact match on a continuum is
// measure-zero). The editor is where that bound lives — `setTolerance` clamps
// to the fraction bounds below, and every `min`/`max` edit re-clamps the
// stored tolerance against the new span in the same commit.
//
// Scoring is opt-in per statement and needs no extra field: SCALES content
// stores `correctValues` (statementId → target value, in scale units), and the
// backend grades a slide as unscored the moment that map is empty (mirroring
// how empty `acceptedAnswers` marks a TEXT slide as a word cloud). So "score
// this statement" is just "set its target", and "make it unscored" is "drop
// its key from the map".
import type { ScaleItem } from "@deck/store/deckApi.gen";

import { buildDefaultScaleItem } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** A scale needs at least one statement to rate … */
const MIN_SCALE_STATEMENTS = 1;
/** … and is capped so the author's list (and the player's screen) stays sane. */
const MAX_SCALE_STATEMENTS = 10;
/** Tolerance is bounded as a fraction of the span (max − min): 2 % at the tightest … */
const SCALES_TOLERANCE_MIN_FRACTION = 0.02;
/** … up to half the track (an almost-anything-goes margin). */
const SCALES_TOLERANCE_MAX_FRACTION = 0.5;
/** Default fraction for a new slide (`buildDefaultContent` bakes it in scale units). */
const SCALES_TOLERANCE_DEFAULT_FRACTION = 0.1;

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
  items: ScaleItem[];
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
  /** Append a blank statement (no-op at the max). */
  addStatement: () => void;
  /** True while above {@link MIN_SCALE_STATEMENTS} — same for every statement. */
  canRemove: boolean;
  /** Debounced label edit. */
  scheduleStatement: (statementId: string | undefined, next: ScaleItem) => void;
  /** Remove a statement and drop its target from `correctValues`. */
  removeStatement: (statementId: string | undefined) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Debounced per-statement target edit → `correctValues[id]`. */
  scheduleCorrectValue: (statementId: string | undefined, value: number) => void;
  /** Immediate per-statement target set (a drag release on the statement's track). */
  commitCorrectValue: (statementId: string | undefined, value: number) => void;
  /** Drop one statement's target, leaving that statement unscored. */
  clearCorrectValue: (statementId: string | undefined) => void;
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
  const items = content?.items ?? [];
  const correctValues = content?.correctValues ?? {};

  const canAddStatement = items.length < MAX_SCALE_STATEMENTS;
  const canRemove = items.length > MIN_SCALE_STATEMENTS;

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
          items,
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
    if (!canAddStatement) return;
    editor.updateSlideContent((prev) => ({ items: [...prev.items, buildDefaultScaleItem()] }));
    editor.flush();
  };

  const scheduleStatement = (id: string | undefined, next: ScaleItem) => {
    if (!id) return;
    // Derive from the freshest pending draft so a sibling statement's edit in
    // the same debounce window isn't clobbered.
    editor.updateSlideContent((prev) => ({
      items: prev.items.map((item) => (item.id === id ? next : item)),
    }));
  };

  const removeStatement = (id: string | undefined) => {
    if (!id || !canRemove) return;
    editor.updateSlideContent((prev) => {
      // Drop the statement's target too, so a stale key can't keep the slide
      // "scored" against a statement the author deleted.
      const { [id]: _removed, ...rest } = prev.correctValues;
      return {
        items: prev.items.filter((item) => item.id !== id),
        correctValues: rest,
      };
    });
    editor.flush();
  };

  const scheduleCorrectValue = (id: string | undefined, value: number) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctValues: { ...prev.correctValues, [id]: value },
    }));
  };

  const commitCorrectValue = (id: string | undefined, value: number) => {
    if (!id) return;
    scheduleCorrectValue(id, value);
    editor.flush();
  };

  const clearCorrectValue = (id: string | undefined) => {
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
    canAddStatement,
    addStatement,
    canRemove,
    scheduleStatement,
    removeStatement,
    scheduleCorrectValue,
    commitCorrectValue,
    clearCorrectValue,
    setTolerance,
  };
};

export {
  MAX_SCALE_STATEMENTS,
  MIN_SCALE_STATEMENTS,
  SCALES_TOLERANCE_DEFAULT_FRACTION,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
};
export type { ScalesQuestionView, UseScalesEditorResult };
