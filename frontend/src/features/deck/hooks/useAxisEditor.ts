import type { Dispatch, SetStateAction } from "react";

import type { AxisPoint, McqOption } from "@deck/store/deckApi.gen";

import type {
  ItemId,
  QuestionActions,
  QuestionBaseState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { clamp01 } from "../utils/placement";
import { buildDefaultAxisItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

const MIN_AXIS_ITEMS = 1;

const MAX_AXIS_ITEMS = 6;
const AXIS_TOLERANCE_MIN = 0.02;
const AXIS_TOLERANCE_MAX = 0.5;
const AXIS_TOLERANCE_DEFAULT = 0.1;
const AXIS_DEFAULT_TARGET: AxisPoint = { x: 0.5, y: 0.5 };
const AXIS_LABEL_MAX = 80;

type AxisAxis = "x" | "y";
type AxisEnd = "low" | "high";

/** Flattened, UI-facing view of the active Axis slide. */
interface AxisQuestionView {
  id: string;
  prompt: string;
  xLowLabel: string;
  xHighLabel: string;
  yLowLabel: string;
  yHighLabel: string;
  items: McqOption[];
  correctPositions: Record<string, AxisPoint>;
  tolerance: number;
}

interface UseAxisEditorResult {
  /** The active Axis slide as a flat view, or undefined until one is selected. */
  question: AxisQuestionView | undefined;
  state: QuestionBaseState;
  actions: QuestionActions<"AXIS">;
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

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

  const scheduleAxisLabel = (axis: AxisAxis, end: AxisEnd, text: string) => {
    editor.updateSlideContent({ [labelField(axis, end)]: text });
  };
  const scheduleCorrectAnswer = (itemId: string | undefined, point: AxisPoint) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => ({
      correctPositions: {
        ...prev.correctPositions,
        [itemId]: { x: clamp01(point.x), y: clamp01(point.y) },
      },
    }));
  };

  const commitCorrectAnswer = (itemId: string | undefined, point: AxisPoint) => {
    if (!itemId) return;
    scheduleCorrectAnswer(itemId, point);
    editor.flush();
  };

  const clearCorrectAnswer = (itemId: string | undefined) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      const { [itemId]: _dropped, ...rest } = prev.correctPositions;
      return { correctPositions: rest };
    });
    editor.flush();
  };

  const getIsScorable = (itemId: ItemId) => content?.correctPositions[itemId] != null;

  const toggleScorability = (itemId: ItemId) => {
    if (getIsScorable(itemId)) {
      clearCorrectAnswer(itemId);
      return;
    }
    commitCorrectAnswer(itemId, AXIS_DEFAULT_TARGET);
  };

  const tolerance = content?.tolerance ?? AXIS_TOLERANCE_DEFAULT;

  const setTolerance: Dispatch<SetStateAction<number>> = (value) => {
    const next = typeof value === "function" ? value(tolerance) : value;
    const clamped = Math.min(AXIS_TOLERANCE_MAX, Math.max(AXIS_TOLERANCE_MIN, next));
    editor.updateSlideContent({ tolerance: clamped });
    editor.flush();
  };

  const state: QuestionBaseState = {
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    displayResultsAsPercentage:
      slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
  };

  const actions: QuestionActions<"AXIS"> = {
    flush: editor.flush,
    scheduleQuestionPrompt,
    scheduleAxisLabel,
    addItem: () => {
      bank.addItem();
    },
    removeItem: bank.removeItem,
    scheduleItemLabel: bank.scheduleItemLabel,
    setItemColor: bank.setItemColor,
    setItemImage: bank.setItemImage,
    handleItemDragEnd: bank.handleItemDragEnd,
    scheduleCorrectAnswer,
    commitCorrectAnswer,
    clearCorrectAnswer,
    getIsScorable,
    toggleScorability,
    tolerance,
    setTolerance,
  };

  return { question, state, actions };
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
