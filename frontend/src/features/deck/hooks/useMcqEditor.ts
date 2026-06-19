// MCQ-specific editing layer for the deck editor's MCQ slide.
//
// Sits on the generic `useSlideEditor<"MCQ">` and exposes the
// intent-level surface the MCQ author UI consumes: a synthesized `question`
// view, prompt + option-collection edits, and per-option ops keyed by option
// id. There is exactly ONE `useSlideEditor` instance per MCQ slide
// (this hook is instantiated once, in `McqSlideContent`), so every write — the
// prompt, each option's text/colour, add/remove/reorder, correct-toggle —
// funnels through a single draft + debounce buffer. That's what keeps
// concurrent option edits from stomping each other; the per-option card is a
// controlled component that receives its slice of this surface as props.
//
// All option identity is compared by `option.id.value`: an `McqOptionId` is a
// `{ value? }` wrapper, while `content.correctOptionIds` holds the bare value
// strings.
import type { McqOption } from "@deck/store/deckApi.gen";
import type { McqDataVisualization } from "@deck/store/deckEnums.gen";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import { buildDefaultMcqOption } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

/** Author can't drop below 2 options (an MCQ needs a real choice) … */
const MIN_MCQ_OPTIONS = 2;
/** … nor add past 6 (beyond that the card grid stops being legible). */
const MAX_MCQ_OPTIONS = 6;

/** Flattened, UI-facing view of the active MCQ slide. */
interface McqQuestionView {
  id: string;
  /** The question text — stored in `slide.title`, not in the content. */
  prompt: string;
  options: McqOption[];
  correctOptionIds: string[];
  /** How live results for this MCQ are charted (NONE = no chart). */
  dataVisualization: McqDataVisualization;
}

interface UseMcqEditorResult {
  /** The active MCQ slide as a flat view, or undefined until one is selected. */
  question: McqQuestionView | undefined;

  /** ── Question-level ──────────────────────────────────────────────────── */
  /** Debounced prompt edit → persisted to `slide.title`. */
  schedulePrompt: (html: string) => void;
  /** Flush any pending debounced edit immediately (bind to blur). */
  flush: () => void;
  /** True while under {@link MAX_MCQ_OPTIONS}. */
  canAddOption: boolean;
  /** Append a blank option (no-op at the max). */
  addOption: () => void;
  /** @dnd-kit drop handler for the option grid. */
  handleOptionDragEnd: (event: DragEndEvent) => void;
  /**
   * Set how this MCQ's live results are charted (immediate commit — it's a
   * discrete pick, like {@link toggleCorrect}, not a typed-into field).
   */
  setDataVisualization: (viz: McqDataVisualization) => void;

  /** ── Per-option (keyed by `option.id.value`) ─────────────────────────── */
  /** True while above {@link MIN_MCQ_OPTIONS} — same for every option. */
  canRemove: boolean;
  isCorrect: (optionId: string | undefined) => boolean;
  /** Debounced field edit (text / colour). */
  scheduleOption: (optionId: string | undefined, next: McqOption) => void;
  /** Immediate field edit (e.g. clearing an image). */
  commitOption: (optionId: string | undefined, next: McqOption) => void;
  toggleCorrect: (optionId: string | undefined) => void;
  removeOption: (optionId: string | undefined) => void;
}

const useMcqEditor = (deckId: string, slideId: string): UseMcqEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "MCQ");

  // `editor.slide` is already narrowed to the MCQ slide (its `content` is the
  // MCQ arm of the `SlideContent` union): passing `"MCQ"` makes the hook
  // runtime-guard on `content.contentType`, so a non-MCQ slide reads back as
  // `undefined` rather than being asserted into the wrong type.
  const slide = editor.slide;
  const content = slide?.content;
  const options = content?.options ?? [];

  const canAddOption = options.length < MAX_MCQ_OPTIONS;
  const canRemove = options.length > MIN_MCQ_OPTIONS;

  // Replace one option in place, deriving from the freshest pending draft so
  // sibling edits in the same debounce window aren't clobbered.
  const setOption = (id: string, next: McqOption) =>
    editor.updateSlideContent((prev) => ({
      options: prev.options.map((o) => (o.id === id ? next : o)),
    }));

  const question: McqQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        options,
        correctOptionIds: content?.correctOptionIds ?? [],
        dataVisualization: content?.dataVisualization ?? "NONE",
      }
    : undefined;

  const schedulePrompt = (html: string) => editor.updateMetadata({ title: html });

  const addOption = () => {
    if (!canAddOption) return;
    editor.updateSlideContent((prev) => ({
      options: [...prev.options, buildDefaultMcqOption()],
    }));
    editor.flush();
  };

  const setDataVisualization = (viz: McqDataVisualization) => {
    editor.updateSlideContent({ dataVisualization: viz });
    editor.flush();
  };

  const handleOptionDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    editor.updateSlideContent((prev) => {
      const next = prev.options.slice();
      const [moved] = next.splice(initialIndex, 1);
      next.splice(index, 0, moved);
      return { options: next };
    });
    editor.flush();
  };

  const isCorrect = (id: string | undefined) =>
    !!id && (content?.correctOptionIds.includes(id) ?? false);

  const scheduleOption = (id: string | undefined, next: McqOption) => {
    if (!id) return;
    setOption(id, next);
  };

  const commitOption = (id: string | undefined, next: McqOption) => {
    if (!id) return;
    setOption(id, next);
    editor.flush();
  };

  const toggleCorrect = (id: string | undefined) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctOptionIds: prev.correctOptionIds.includes(id)
        ? prev.correctOptionIds.filter((c) => c !== id)
        : [...prev.correctOptionIds, id],
    }));
    editor.flush();
  };

  const removeOption = (id: string | undefined) => {
    if (!id || !canRemove) return;
    editor.updateSlideContent((prev) => ({
      options: prev.options.filter((o) => o.id !== id),
      correctOptionIds: prev.correctOptionIds.filter((c) => c !== id),
    }));
    editor.flush();
  };

  return {
    question,
    schedulePrompt,
    flush: editor.flush,
    canAddOption,
    addOption,
    handleOptionDragEnd,
    setDataVisualization,
    canRemove,
    isCorrect,
    scheduleOption,
    commitOption,
    toggleCorrect,
    removeOption,
  };
};

export { MAX_MCQ_OPTIONS, MIN_MCQ_OPTIONS, useMcqEditor };
export type { McqQuestionView, UseMcqEditorResult };
