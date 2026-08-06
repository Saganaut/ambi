// Allocation-specific editing layer for the deck editor's Allocation slide.
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import type { AppImage, McqOption } from "@deck/store/deckApi.gen";

import {
  AllocationQuestionActions,
  NonSortableEditableItem,
  QuestionBaseActions,
  QuestionBaseState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { buildDefaultAllocationOption } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

const MIN_ALLOCATION_OPTIONS = 2;
const MAX_ALLOCATION_OPTIONS = 6;
const ALLOCATION_TOTAL_MIN = 1;
//TODO: Move this somwhere else
const ALLOCATION_OPTION_LABEL_MAX = 80;

/** Flattened, UI-facing view of the active Allocation slide. */
interface AllocationQuestionView {
  id: string;
  prompt: string;
  options: McqOption[];
  correctAllocations: Record<string, number>;
  totalPointsToAllocate: number;
  tolerancePerItem: number;
}

interface UseAllocationEditorResult {
  question: AllocationQuestionView | undefined;
  baseState: QuestionBaseState;
  baseActions: QuestionBaseActions;
  extendedActions: AllocationQuestionActions;
}

/** Answers are whole points inside the pool. */
const clampPoints = (value: number, total: number): number =>
  Math.min(total, Math.max(0, Math.round(value)));

/** Move one option while preserving each option's identity and id-keyed answer. */
const reorderAllocationItems = (
  options: readonly McqOption[],
  initialIndex: number,
  index: number,
): McqOption[] => {
  const next = options.slice();
  const [moved] = next.splice(initialIndex, 1);
  next.splice(index, 0, moved);
  return next;
};

const useAllocationEditor = (deckId: string, slideId: string): UseAllocationEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "ALLOCATION");

  const slide = editor.slide;
  const content = slide?.content;
  const options = content?.options ?? [];

  const canAddItem = options.length < MAX_ALLOCATION_OPTIONS;
  const canRemoveItem = options.length > MIN_ALLOCATION_OPTIONS;

  const question: AllocationQuestionView | undefined =
    slide && content
      ? {
          id: slide.id,
          prompt: slide.title,
          options,
          correctAllocations: content.correctAllocations ?? {},
          totalPointsToAllocate: content.totalPointsToAllocate,
          tolerancePerItem: content.tolerancePerOption,
        }
      : undefined;

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

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

  const addItem = () => {
    if (!canAddItem) return;
    editor.updateSlideContent((prev) => ({
      options: [...prev.options, buildDefaultAllocationOption()],
    }));
    editor.flush();
  };

  const removeItem = (id: string | undefined) => {
    if (!id || !canRemoveItem) return;
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

  const handleItemDragEnd = (event: DragEndEvent) => {
    if (event.canceled) return;
    const { source } = event.operation;
    if (!isSortable(source)) return;
    const { initialIndex, index } = source;
    if (initialIndex === index) return;
    editor.updateSlideContent((prev) => ({
      options: reorderAllocationItems(prev.options, initialIndex, index),
    }));
    editor.flush();
  };

  // Merge a patch into one option, deriving from the freshest pending draft so
  // sibling edits in the same debounce window aren't clobbered (MCQ's pattern).
  const patchItem = (id: string, patch: Partial<McqOption>) =>
    editor.updateSlideContent((prev) => ({
      options: prev.options.map((option) => (option.id === id ? { ...option, ...patch } : option)),
    }));

  const scheduleItemText = (id: string | undefined, text: string) => {
    if (!id) return;
    patchItem(id, { text });
  };

  const setItemColor = (id: string | undefined, color: string) => {
    if (!id) return;
    patchItem(id, { color });
    editor.flush();
  };

  const setItemImage = (id: string | undefined, image: AppImage) => {
    if (!id) return;
    patchItem(id, { image });
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

  const itemPreparer = (option: McqOption, sourceIndex: number): NonSortableEditableItem => {
    const item = { label: option.text ?? "", color: option.color ?? "", ...option };
    const detail = {
      type: "allocation",
      correctValue: correctAllocations[option.id],
      value: correctAllocations[option.id],
      totalPool: totalPoints,
      onCommit: (points: number) => {
        editor.extendedActions.commitCorrectAllocation(option.id, points);
      },
      onScheduleAnswer: (points: number) => {
        editor.scheduleCorrectAllocation(option.id, points);
      },
      onClear: () => {
        editor.clearCorrectAllocation(option.id);
      },
    };
    const actions = {};
    const ui = {};

    return { sourceIndex, item, actions, detail, ui };
  };

  const baseActions = {
    flush: editor.flush,
    setItemColor,
    setItemImage,
    removeItem,
    addItem,
    handleItemDragEnd,
    scheduleQuestionPrompt,
    scheduleItemText,
  };

  const baseState = {
    canAddItem,
    canRemoveItem,
  };

  const extendedActions = {
    scheduleTotalPoints,
    scheduleTolerance,
    scheduleCorrectAllocation,
    commitCorrectAllocation,
    clearCorrectAllocation,
  };

  return {
    baseState,
    question,
    baseActions,
    extendedActions,
  };
};

export {
  ALLOCATION_OPTION_LABEL_MAX,
  ALLOCATION_TOTAL_MIN,
  MAX_ALLOCATION_OPTIONS,
  MIN_ALLOCATION_OPTIONS,
  reorderAllocationItems,
  useAllocationEditor,
};
export type { AllocationQuestionView, UseAllocationEditorResult };
