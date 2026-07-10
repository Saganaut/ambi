// Allocation-specific editing layer for the deck editor's Allocation slide.
//
// Sits on the generic `useSlideEditor<"ALLOCATION">` and exposes the
// intent-level surface the Allocation author UI consumes: a synthesized
// `question` view, a prompt edit, the pool-level fields (total points /
// per-option tolerance), and per-option ops keyed by option id. There is
// exactly ONE `useSlideEditor` instance per Allocation slide (this hook is
// instantiated once, in `AllocationSlideContent`), so every write funnels
// through a single draft + debounce buffer.
//
// An ALLOCATION slide hands players a fixed pool of points to split across
// the options (the same `McqOption` records MCQ uses, so color/image ops are
// MCQ's). Scoring is opt-in per option, Scales-style: `correctAllocations`
// maps option id → its share of the pool, graded within `tolerancePerOption`
// points, and the backend treats an empty map as unscored (collect-only).
// Structural edits keep that map consistent: removing an option drops its
// answer. Pool edits never rewrite keyed answers — a mid-typing total would
// destructively clamp them — so a sum that drifts from the pool is surfaced
// by the editor's footer instead.
import type { AppImage, McqOption } from "@deck/store/deckApi.gen";

import { buildDefaultAllocationOption } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** Author can't drop below 2 options (a split needs a real choice) … */
const MIN_ALLOCATION_OPTIONS = 2;
/** … nor add past 6 (matches MCQ's cap and the 6-color option palette). */
const MAX_ALLOCATION_OPTIONS = 6;
/** A pool needs at least one point to hand out. */
const ALLOCATION_TOTAL_MIN = 1;
/** `maxLength` for option label inputs (item-row parity across kinds). */
const ALLOCATION_OPTION_LABEL_MAX = 80;

/** Flattened, UI-facing view of the active Allocation slide. */
interface AllocationQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  options: McqOption[];
  /** optionId → correct share of the pool; empty means the slide is unscored. */
  correctAllocations: Record<string, number>;
  /** The pool every player splits across the options. */
  totalPointsToAllocate: number;
  /** ± points around each option's answer that still count as correct. */
  tolerancePerOption: number;
}

interface UseAllocationEditorResult {
  /** The active Allocation slide as a flat view, or undefined until one is selected. */
  question: AllocationQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
  /** Debounced pool-size edit (clamped to ≥ {@link ALLOCATION_TOTAL_MIN}). */
  scheduleTotalPoints: (value: number) => void;
  /** Debounced tolerance edit (clamped to [0, pool]). */
  scheduleTolerance: (value: number) => void;

  /** ── Options (keyed by `option.id`) ──────────────────────────────────── */
  /** True while under {@link MAX_ALLOCATION_OPTIONS}. */
  canAddOption: boolean;
  /** True while above {@link MIN_ALLOCATION_OPTIONS} — same for every option. */
  canRemoveOption: boolean;
  /** Append a blank option (no-op at the max). Immediate. */
  addOption: () => void;
  /** Remove the option and drop its answer from `correctAllocations`. */
  removeOption: (optionId: string | undefined) => void;
  /** Debounced label edit. */
  scheduleOptionText: (optionId: string | undefined, text: string) => void;
  /** Override the option's palette color (menu swatch / custom picker). Immediate. */
  setOptionColor: (optionId: string | undefined, color: string) => void;
  /** Set or clear (empty AppImage) the option's image. Immediate. */
  setOptionImage: (optionId: string | undefined, image: AppImage) => void;

  /** ── Scoring ─────────────────────────────────────────────────────────── */
  /** Debounced per-option answer edit → `correctAllocations[id]` (clamped to [0, pool]). */
  scheduleCorrectAllocation: (optionId: string | undefined, points: number) => void;
  /** Immediate per-option answer set (the row's "Set answer" seed). */
  commitCorrectAllocation: (optionId: string | undefined, points: number) => void;
  /** Drop one option's answer, leaving that option unscored. */
  clearCorrectAllocation: (optionId: string | undefined) => void;
}

/** Answers are whole points inside the pool. */
const clampPoints = (value: number, total: number): number =>
  Math.min(total, Math.max(0, Math.round(value)));

const useAllocationEditor = (deckId: string, slideId: string): UseAllocationEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "ALLOCATION");

  const slide = editor.slide;
  const content = slide?.content;
  const options = content?.options ?? [];

  const canAddOption = options.length < MAX_ALLOCATION_OPTIONS;
  const canRemoveOption = options.length > MIN_ALLOCATION_OPTIONS;

  const question: AllocationQuestionView | undefined =
    slide && content
      ? {
          id: slide.id,
          prompt: slide.title,
          options,
          correctAllocations: content.correctAllocations ?? {},
          totalPointsToAllocate: content.totalPointsToAllocate,
          tolerancePerOption: content.tolerancePerOption,
        }
      : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const scheduleTotalPoints = (value: number) => {
    editor.updateSlideContent({
      totalPointsToAllocate: Math.max(ALLOCATION_TOTAL_MIN, Math.round(value)),
    });
  };

  const scheduleTolerance = (value: number) => {
    editor.updateSlideContent((prev) => ({
      tolerancePerOption: clampPoints(value, prev.totalPointsToAllocate),
    }));
  };

  const addOption = () => {
    if (!canAddOption) return;
    editor.updateSlideContent((prev) => ({
      options: [...prev.options, buildDefaultAllocationOption()],
    }));
    editor.flush();
  };

  const removeOption = (id: string | undefined) => {
    if (!id || !canRemoveOption) return;
    editor.updateSlideContent((prev) => {
      // Drop the option's answer too, so a stale key can't keep the slide
      // "scored" against an option the author deleted.
      const { [id]: _removed, ...rest } = prev.correctAllocations ?? {};
      return {
        options: prev.options.filter((option) => option.id !== id),
        correctAllocations: rest,
      };
    });
    editor.flush();
  };

  // Merge a patch into one option, deriving from the freshest pending draft so
  // sibling edits in the same debounce window aren't clobbered (MCQ's pattern).
  const patchOption = (id: string, patch: Partial<McqOption>) =>
    editor.updateSlideContent((prev) => ({
      options: prev.options.map((option) =>
        option.id === id ? { ...option, ...patch } : option,
      ),
    }));

  const scheduleOptionText = (id: string | undefined, text: string) => {
    if (!id) return;
    patchOption(id, { text });
  };

  const setOptionColor = (id: string | undefined, color: string) => {
    if (!id) return;
    patchOption(id, { color });
    editor.flush();
  };

  const setOptionImage = (id: string | undefined, image: AppImage) => {
    if (!id) return;
    patchOption(id, { image });
    editor.flush();
  };

  const scheduleCorrectAllocation = (id: string | undefined, points: number) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctAllocations: {
        ...prev.correctAllocations,
        [id]: clampPoints(points, prev.totalPointsToAllocate),
      },
    }));
  };

  const commitCorrectAllocation = (id: string | undefined, points: number) => {
    if (!id) return;
    scheduleCorrectAllocation(id, points);
    editor.flush();
  };

  const clearCorrectAllocation = (id: string | undefined) => {
    if (!id) return;
    editor.updateSlideContent((prev) => {
      const { [id]: _removed, ...rest } = prev.correctAllocations ?? {};
      return { correctAllocations: rest };
    });
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    scheduleTotalPoints,
    scheduleTolerance,
    canAddOption,
    canRemoveOption,
    addOption,
    removeOption,
    scheduleOptionText,
    setOptionColor,
    setOptionImage,
    scheduleCorrectAllocation,
    commitCorrectAllocation,
    clearCorrectAllocation,
  };
};

export {
  ALLOCATION_OPTION_LABEL_MAX,
  ALLOCATION_TOTAL_MIN,
  MAX_ALLOCATION_OPTIONS,
  MIN_ALLOCATION_OPTIONS,
  useAllocationEditor,
};
export type { AllocationQuestionView, UseAllocationEditorResult };
