import type { RankItem } from "@deck/store/deckApi.gen";

import type {
  QuestionActions,
  QuestionState,
} from "../components/DeckEditor/SlideContent/_shared/Item.types";
import { buildDefaultRankItem } from "../utils/slideContent";
import { useItemBankEditor } from "./useItemBankEditor";
import { useSlideEditor } from "./useSlideEditor";

const MIN_RANKING_ITEMS = 2;
const MAX_RANKING_ITEMS = 6;

/** A bank item carrying the id its correct-order entry is keyed by. */
type RankBankItem = RankItem & { id: string };

interface RankingQuestionView {
  id: string;
  prompt: string;
  items: RankBankItem[];
  correctOrder: string[];
}

interface UseRankingEditorResult {
  question: RankingQuestionView | undefined;
  state: QuestionState<"RANKING">;
  actions: QuestionActions<"RANKING">;
}

const orderOf = (items: readonly RankItem[]): string[] =>
  items.map((item) => item.id).filter((id): id is string => id != null);

const useRankingEditor = (deckId: string, slideId: string): UseRankingEditorResult => {
  const editor = useSlideEditor(deckId, slideId, "RANKING");

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
export type { RankBankItem, RankingQuestionView, UseRankingEditorResult };
