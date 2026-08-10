import type { Dispatch, SetStateAction } from "react";

import type { ScaleItem } from "@deck/store/deckApi.gen";

import type {
  ItemId,
  QuestionActions,
  QuestionState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
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

/** A statement carrying the id its target value is keyed by. */
type ScaleBankItem = ScaleItem & { id: string };

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
  items: ScaleBankItem[];
  /** statementId → target value; empty means the slide is unscored. */
  correctValues: Record<ItemId, number>;
  /** True when any statement has a target — i.e. the slide is graded. */
  scored: boolean;
}

interface UseScalesEditorResult {
  /** The active Scales slide as a flat view, or undefined until one is selected. */
  question: ScalesQuestionView | undefined;
  /** Capability flags: {@link MIN_SCALE_STATEMENTS} / {@link MAX_SCALE_STATEMENTS} bounds. */
  state: QuestionState<"SCALES">;
  /** `schedule*` debounces, `commit*` writes and flushes, `set*` is immediate. */
  actions: QuestionActions<"SCALES">;
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

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

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

  const scheduleCorrectAnswer = (id: ItemId | undefined, value: number) => {
    if (!id) return;
    editor.updateSlideContent((prev) => ({
      correctValues: { ...prev.correctValues, [id]: value },
    }));
  };

  const commitCorrectAnswer = (id: ItemId | undefined, value: number) => {
    if (!id) return;
    scheduleCorrectAnswer(id, value);
    editor.flush();
  };

  const clearCorrectAnswer = (id: ItemId | undefined) => {
    if (!id) return;
    editor.updateSlideContent((prev) => {
      const { [id]: _removed, ...rest } = prev.correctValues;
      return { correctValues: rest };
    });
    editor.flush();
  };

  const getIsScorable = (itemId: ItemId) => correctValues[itemId] !== undefined;

  /**
   * A scale always has a point to seed, so arming a statement lands its target
   * on the midpoint — the author then drags it along the track (unlike Grid /
   * Place-on-Image, which have no cell or pixel to guess).
   */
  const toggleScorability = (itemId: ItemId) => {
    if (getIsScorable(itemId)) {
      clearCorrectAnswer(itemId);
      return;
    }
    if (!content) return;
    commitCorrectAnswer(itemId, (content.min + content.max) / 2);
  };

  const tolerance = content?.tolerance ?? 0;

  const setTolerance: Dispatch<SetStateAction<number>> = (value) => {
    editor.updateSlideContent((prev) => ({
      tolerance: clampTolerance(
        typeof value === "function" ? value(prev.tolerance) : value,
        prev.max - prev.min,
      ),
    }));
    editor.flush();
  };

  const state: QuestionState<"SCALES"> = {
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    displayResultsAsPercentage:
      slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
  };

  const actions: QuestionActions<"SCALES"> = {
    flush: editor.flush,
    scheduleQuestionPrompt,
    scheduleMin,
    scheduleMax,
    scheduleLeftLabel,
    scheduleRightLabel,
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
  MAX_SCALE_STATEMENTS,
  MIN_SCALE_STATEMENTS,
  SCALES_STATEMENT_LABEL_MAX,
  SCALES_TOLERANCE_DEFAULT_FRACTION,
  SCALES_TOLERANCE_MAX_FRACTION,
  SCALES_TOLERANCE_MIN_FRACTION,
  useScalesEditor,
};
export type { ScaleBankItem, ScalesQuestionView, UseScalesEditorResult };
