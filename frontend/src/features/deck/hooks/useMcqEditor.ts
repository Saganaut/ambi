import type { AppImage, McqOption } from "@deck/store/deckApi.gen";
import type { McqDataVisualization } from "@deck/store/deckEnums.gen";
import type { DragEndEvent } from "@dnd-kit/react";
import { isSortable } from "@dnd-kit/react/sortable";

import {
  QuestionActions,
  QuestionBaseState,
  QuestionViewBase,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { buildDefaultMcqOption } from "../utils/slideContent";
import { useSlideEditor } from "./useSlideEditor";

const MIN_MCQ_OPTIONS = 2;
const MAX_MCQ_OPTIONS = 6;

interface McqQuestionView extends QuestionViewBase {
  options: McqOption[];
  correctOptionIds: string[];
  dataVisualization: McqDataVisualization;
}

interface UseMcqEditorResult {
  question: McqQuestionView | undefined;
  state: QuestionBaseState;
  actions: QuestionActions<"MCQ">;
}

const useMcqEditor = (deckId: string, slideId: string): UseMcqEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "MCQ");
  const slide = editor.slide;
  const content = slide?.content;
  const options = content?.options ?? [];

  const canAddItem = options.length < MAX_MCQ_OPTIONS;
  const canRemoveItem = options.length > MIN_MCQ_OPTIONS;
  const patchOption = (id: string, patch: Partial<McqOption>) =>
    editor.updateSlideContent((prev) => ({
      options: prev.options.map((o) => (o.id === id ? { ...o, ...patch } : o)),
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

  const addItem = () => {
    if (!canAddItem) return;
    editor.updateSlideContent((prev) => ({
      options: [...prev.options, buildDefaultMcqOption()],
    }));
    editor.flush();
  };

  const setDataVisualization = (viz: McqDataVisualization) => {
    editor.updateSlideContent({ dataVisualization: viz });
    editor.flush();
  };

  const handleItemDragEnd = (event: DragEndEvent) => {
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

  const getIsScorable = (id: string | undefined) =>
    !!id && (content?.correctOptionIds.includes(id) ?? false);

  const scheduleItemLabel = (id: string | undefined, text: string) => {
    if (!id) return;
    patchOption(id, { text });
  };

  const setItemColor = (id: string | undefined, color: string) => {
    if (!id) return;
    patchOption(id, { color });
    editor.flush();
  };

  const setItemImage = (id: string | undefined, image: AppImage) => {
    if (!id) return;
    patchOption(id, { image });
    editor.flush();
  };

  const toggleScorability = (id: string | undefined) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctOptionIds: prev.correctOptionIds.includes(id)
        ? prev.correctOptionIds.filter((c) => c !== id)
        : [...prev.correctOptionIds, id],
    }));
    editor.flush();
  };

  const removeItem = (id: string | undefined) => {
    if (!id || !canRemoveItem) return;
    editor.updateSlideContent((prev) => ({
      options: prev.options.filter((o) => o.id !== id),
      correctOptionIds: prev.correctOptionIds.filter((c) => c !== id),
    }));
    editor.flush();
  };

  const actions = {
    scheduleQuestionPrompt: schedulePrompt,
    flush: editor.flush,
    getIsScorable,
    toggleScorability,
    handleItemDragEnd,
    removeItem,
    addItem,
    scheduleItemLabel,
    setItemColor,
    setItemImage,
    setDataVisualization,
  };

  const state = {
    canAddItem,
    canRemoveItem,
    displayResultsAsPercentage:
      editor.slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
  };

  return {
    state,
    question,
    actions,
  };
};

export { MAX_MCQ_OPTIONS, MIN_MCQ_OPTIONS, useMcqEditor };
export type { McqQuestionView, UseMcqEditorResult };
