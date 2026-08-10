import { RankingQuestionView } from "@/features/deck/hooks/useRankingEditor";
import { SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useRankingDraft({
  question,
}: {
  question?: RankingQuestionView;
}): SlideDraft<"RANKING"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);

  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
  }

  return {
    setPrompt,
    prompt,
    setOpenMenuId,
    openMenuId,
    syncedFromId,
    setSyncedFromId,
  };
}
