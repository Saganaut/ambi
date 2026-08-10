import type { Dispatch, SetStateAction } from "react";

import type { AppImage, PlacePoint } from "@deck/store/deckApi.gen";

import type {
  ItemId,
  QuestionActions,
  QuestionState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { clamp01 } from "../utils/placement";
import { buildDefaultPlaceItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

/** A slide with no targets has nothing to pin, so the last row keeps its
 * place: `canRemove` is false at the floor. */
const MIN_PLACE_TARGETS = 1;
/** Cap the pin targets where the shared 6-color option palette runs out, so
 * every marker keeps a distinct hue (and single-digit index), matching Axis. */
const MAX_PLACE_TARGETS = 6;
/** Tolerance is a normalized radius: 2 % of the image at the tightest … */
const PLACE_TOLERANCE_MIN = 0.02;
/** … up to half the image (an almost-anything-goes region). */
const PLACE_TOLERANCE_MAX = 0.5;
/** Default tolerance for a new slide (also set by `buildDefaultContent`). */
const PLACE_TOLERANCE_DEFAULT = 0.1;
/** `maxLength` for target label inputs (mirrors `AXIS_LABEL_MAX`). */
const PLACE_LABEL_MAX = 80;

/** An item with its answer-key point folded in for the UI. */
interface PlaceItemView {
  /** The item's address — its wire id, guaranteed by the load-time backfill. */
  id: string;
  label?: string;
  image?: AppImage;
  /** Authored color override; the palette default applies when absent. */
  color?: string;
  /** The item's target point, absent while it carries no answer-key entry. */
  x?: number;
  y?: number;
}

/** Whether the item carries an answer-key point — i.e. is graded at all. A
 *  predicate rather than a plain boolean so a placed target's coordinates read
 *  as the numbers they are at the call site. */
const isPlaced = (target: PlaceItemView): target is PlaceItemView & PlacePoint =>
  target.x != null && target.y != null;

/** Flattened, UI-facing view of the active Place-on-Image slide. */
interface PlaceOnImageQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** The backing image players pin on (blank external placeholder until set). */
  image: AppImage;
  /** The items to place, in authored order (marker index = row index), each
   * with its answer-key point folded in when it has one. */
  targets: PlaceItemView[];
  /** The answer key itself, keyed by item id — the placement surface reads the
   * fold above, the bank rows read this. */
  correctPositions: Record<ItemId, PlacePoint>;
  /** Normalized radius around each target that counts as correct. */
  tolerance: number;
}

interface UsePlaceOnImageEditorResult {
  /** The active slide as a flat view, or undefined until one is selected. */
  question: PlaceOnImageQuestionView | undefined;
  state: QuestionState<"PLACE_ON_IMAGE">;
  actions: QuestionActions<"PLACE_ON_IMAGE">;
}

const usePlaceOnImageEditor = (deckId: string, slideId: string): UsePlaceOnImageEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "PLACE_ON_IMAGE");

  const slide = editor.slide;
  const content = slide?.content;

  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items }),
    buildItem: buildDefaultPlaceItem,
    minItems: MIN_PLACE_TARGETS,
    maxItems: MAX_PLACE_TARGETS,
    onRemoveItem: (prev, itemId) => {
      const { [itemId]: _dropped, ...rest } = prev.correctPositions;
      return { correctPositions: rest };
    },
  });

  const question: PlaceOnImageQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        image: content?.image ?? { external: true },
        // The spread folds in the item's answer-key point when it has one, and
        // leaves x/y absent when it does not.
        targets: bank.items.map((item) => ({ ...item, ...content?.correctPositions[item.id] })),
        correctPositions: content?.correctPositions ?? {},
        tolerance: content?.tolerance ?? PLACE_TOLERANCE_DEFAULT,
      }
    : undefined;

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

  const setImage = (image: AppImage) => {
    editor.updateSlideContent({ image });
    editor.flush();
  };

  /** Mint an item and its answer-key entry together — a press on the open image
   *  places what it creates, so the two can never disagree. */
  const addItemAtPoint = (point: PlacePoint) => {
    bank.addItem((item, prev) => ({
      correctPositions: {
        ...prev.correctPositions,
        [item.id]: { x: clamp01(point.x), y: clamp01(point.y) },
      },
    }));
  };

  /** A marker drag carries an id and nothing else, so the item is resolved
   *  against the freshest draft first: a stale id must be inert rather than
   *  mint an answer-key entry for an item that no longer exists. */
  const scheduleCorrectAnswer = (itemId: ItemId | undefined, point: PlacePoint) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      if (!prev.items.some((item) => item.id === itemId)) return {};
      return {
        correctPositions: {
          ...prev.correctPositions,
          [itemId]: { x: clamp01(point.x), y: clamp01(point.y) },
        },
      };
    });
  };

  const commitCorrectAnswer = (itemId: ItemId | undefined, point: PlacePoint) => {
    if (!itemId) return;
    scheduleCorrectAnswer(itemId, point);
    editor.flush();
  };

  const clearCorrectAnswer = (itemId: ItemId | undefined) => {
    if (!itemId) return;
    editor.updateSlideContent((prev) => {
      const { [itemId]: _dropped, ...rest } = prev.correctPositions;
      return { correctPositions: rest };
    });
    editor.flush();
  };

  const getIsScorable = (itemId: ItemId) => content?.correctPositions[itemId] != null;

  /**
   * Only a placed target can be toggled off here: an unplaced one has no point
   * to seed that the author did not choose, so the author surface arms it and
   * the press on the image names the point (mirrors Grid).
   */
  const toggleScorability = (itemId: ItemId) => {
    if (!getIsScorable(itemId)) return;
    clearCorrectAnswer(itemId);
  };

  const tolerance = content?.tolerance ?? PLACE_TOLERANCE_DEFAULT;

  const setTolerance: Dispatch<SetStateAction<number>> = (value) => {
    const next = typeof value === "function" ? value(tolerance) : value;
    const clamped = Math.min(PLACE_TOLERANCE_MAX, Math.max(PLACE_TOLERANCE_MIN, next));
    editor.updateSlideContent({ tolerance: clamped });
    editor.flush();
  };

  const state: QuestionState<"PLACE_ON_IMAGE"> = {
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    displayResultsAsPercentage:
      slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
  };

  const actions: QuestionActions<"PLACE_ON_IMAGE"> = {
    flush: editor.flush,
    scheduleQuestionPrompt,
    setImage,
    addItem: () => {
      bank.addItem();
    },
    addItemAtPoint,
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
  isPlaced,
  MAX_PLACE_TARGETS,
  MIN_PLACE_TARGETS,
  PLACE_LABEL_MAX,
  PLACE_TOLERANCE_DEFAULT,
  PLACE_TOLERANCE_MAX,
  PLACE_TOLERANCE_MIN,
  usePlaceOnImageEditor,
};
export type { PlaceItemView, PlaceOnImageQuestionView, UsePlaceOnImageEditorResult };
