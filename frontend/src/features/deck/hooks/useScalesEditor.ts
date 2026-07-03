// Scales-specific editing layer for the deck editor's Scales (Likert) slide.
//
// Sits on the generic `useSlideEditor<"SCALES">` and exposes the intent-level
// surface the Scales author UI consumes: a synthesized `question` view, a
// prompt edit, the scale-level fields (min / max / step / anchor labels /
// tolerance), and per-statement ops keyed by statement id. There is exactly ONE
// `useSlideEditor` instance per Scales slide (this hook is instantiated once,
// in `ScalesSlideContent`), so every write — the prompt, the scale settings,
// each statement's label and target — funnels through a single draft + debounce
// buffer.
//
// Scoring is opt-in and needs no extra field: SCALES content stores
// `correctValues` (statementId → target value), and the backend grades a slide
// as unscored the moment that map is empty (mirroring how empty
// `acceptedAnswers` marks a TEXT slide as a word cloud). So "make this scored"
// is just "start filling in per-statement targets", and "make this unscored" is
// "clear the map".
import type { ScaleItem } from "@deck/store/deckApi.gen";

import { buildDefaultScaleItem } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** A scale needs at least one statement to rate … */
const MIN_SCALE_STATEMENTS = 1;
/** … and is capped so the author's list (and the player's screen) stays sane. */
const MAX_SCALE_STATEMENTS = 10;

/** Flattened, UI-facing view of the active Scales slide. */
interface ScalesQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  min: number;
  max: number;
  step: number;
  leftLabel: string;
  rightLabel: string;
  /** ± margin around each target that still counts as correct (scored only). */
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
  /** Debounced scale-field edits (bind change → schedule, blur → flush). */
  scheduleMin: (value: number) => void;
  scheduleMax: (value: number) => void;
  scheduleStep: (value: number) => void;
  scheduleLeftLabel: (value: string) => void;
  scheduleRightLabel: (value: string) => void;
  scheduleTolerance: (value: number) => void;

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
  /** Drop every target, turning the slide unscored. */
  clearCorrectValues: () => void;
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
          step: content.step,
          leftLabel: content.leftLabel,
          rightLabel: content.rightLabel,
          tolerance: content.tolerance,
          items,
          correctValues,
          scored: Object.keys(correctValues).length > 0,
        }
      : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  // Scale-level fields are independent scalars, so a plain object patch is safe
  // (shallow-merged onto the freshest content); no function form needed.
  const scheduleMin = (value: number) => editor.updateSlideContent({ min: value });
  const scheduleMax = (value: number) => editor.updateSlideContent({ max: value });
  const scheduleStep = (value: number) => editor.updateSlideContent({ step: value });
  const scheduleLeftLabel = (value: string) => editor.updateSlideContent({ leftLabel: value });
  const scheduleRightLabel = (value: string) => editor.updateSlideContent({ rightLabel: value });
  const scheduleTolerance = (value: number) => editor.updateSlideContent({ tolerance: value });

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

  const clearCorrectValues = () => {
    editor.updateSlideContent({ correctValues: {} });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    scheduleMin,
    scheduleMax,
    scheduleStep,
    scheduleLeftLabel,
    scheduleRightLabel,
    scheduleTolerance,
    canAddStatement,
    addStatement,
    canRemove,
    scheduleStatement,
    removeStatement,
    scheduleCorrectValue,
    clearCorrectValues,
  };
};

export { MAX_SCALE_STATEMENTS, MIN_SCALE_STATEMENTS, useScalesEditor };
export type { ScalesQuestionView, UseScalesEditorResult };
