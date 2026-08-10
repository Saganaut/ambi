// Ranking-specific editing layer for the deck editor's Ranking slide.
//
// Sits on the generic `useSlideEditor<"RANKING">` and the shared
// `useItemBankEditor`, exposing the intent-level surface the Ranking author UI
// consumes: a synthesized `question` view, a prompt edit, and the bank's
// per-item ops keyed by item id. There is exactly ONE `useSlideEditor` instance
// per Ranking slide (this hook is instantiated once, in `RankingSlideContent`)
// and the bank is handed that instance rather than mounting its own, so every
// write — the prompt, each item's label, add / remove / reorder — funnels
// through a single draft + debounce buffer.
//
// The authoring order IS the correct order. RANKING content stores
// `correctOrder` (item ids, top → bottom) alongside `items`; at play time the
// items are shuffled and the player drags them back into order. Rebuilding it
// is folded into the bank's `toPatch`, the single funnel for every write the
// bank makes, so the order mirror can never fall out of lockstep with `items`.
import type { RankItem } from "@deck/store/deckApi.gen";

import type {
  QuestionActions,
  QuestionState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import type { Identified } from "../components/DeckEditor/SlideContent/_shared/placement/placement.types";
import { buildDefaultRankItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

/** A ranking needs at least two items to be a real ordering … */
const MIN_RANKING_ITEMS = 2;
/** … and is capped at eight so the shuffled play-time list stays legible. */
const MAX_RANKING_ITEMS = 6;

/** Flattened, UI-facing view of the active Ranking slide. */
interface RankingQuestionView {
  id: string;
  /** The prompt text — stored in `slide.title`, not in the content. */
  prompt: string;
  /** The list, every item carrying the id `correctOrder` records it by. */
  items: Identified<RankItem>[];
  /** Item ids in the correct order, top → bottom (mirrors `items` order). */
  correctOrder: string[];
}

interface UseRankingEditorResult {
  /** The active Ranking slide as a flat view, or undefined until one is selected. */
  question: RankingQuestionView | undefined;
  /** Capability flags: {@link MIN_RANKING_ITEMS} / {@link MAX_RANKING_ITEMS} bounds. */
  state: QuestionState<"RANKING">;
  /** `schedule*` debounces, `set*` is immediate. */
  actions: QuestionActions<"RANKING">;
}

/** Item ids in list order, dropping any without an id (defensive: the load-time
 *  backfill mints one for every item, so nothing should be dropped here). */
const orderOf = (items: readonly RankItem[]): string[] =>
  items.map((item) => item.id).filter((id): id is string => id != null);

const useRankingEditor = (deckId: string, slideId: string): UseRankingEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "RANKING");

  // `editor.slide` is already narrowed to the RANKING slide (its `content` is
  // the RANKING arm of the `SlideContent` union): passing `"RANKING"` makes the
  // hook runtime-guard on `content.contentType`, so a non-ranking slide reads
  // back as `undefined` rather than being asserted into the wrong type.
  const slide = editor.slide;
  const content = slide?.content;

  const bank = useItemBankEditor(editor, {
    slideId,
    toPatch: (items) => ({ items, correctOrder: orderOf(items) }),
    buildItem: buildDefaultRankItem,
    minItems: MIN_RANKING_ITEMS,
    maxItems: MAX_RANKING_ITEMS,
  });

  const question: RankingQuestionView | undefined = slide
    ? {
        id: slide.id,
        prompt: slide.title,
        items: bank.items,
        correctOrder: content?.correctOrder ?? [],
      }
    : undefined;

  const scheduleQuestionPrompt = (html: string) => editor.updateMetadata({ title: html });

  /**
   * The authored order is the whole answer key, so every item is always part
   * of it: scorability is a constant, and toggling it per item is meaningless.
   */
  const getIsScorable = () => true;
  const toggleScorability = () => undefined;

  const state: QuestionState<"RANKING"> = {
    canAddItem: bank.canAdd,
    canRemoveItem: bank.canRemove,
    displayResultsAsPercentage:
      slide?.settings?.answerSettings?.displayResultsAsPercentage ?? false,
  };

  const actions: QuestionActions<"RANKING"> = {
    flush: editor.flush,
    scheduleQuestionPrompt,
    addItem: () => {
      bank.addItem();
    },
    removeItem: bank.removeItem,
    scheduleItemLabel: bank.scheduleItemLabel,
    setItemColor: bank.setItemColor,
    setItemImage: bank.setItemImage,
    handleItemDragEnd: bank.handleItemDragEnd,
    getIsScorable,
    toggleScorability,
  };

  return { question, state, actions };
};

export { MAX_RANKING_ITEMS, MIN_RANKING_ITEMS, useRankingEditor };
export type { RankingQuestionView, UseRankingEditorResult };
