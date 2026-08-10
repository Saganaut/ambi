import { McqQuestionView } from "@/features/deck/hooks/useMcqEditor";
import { SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useMcqDraft({ question }: { question?: McqQuestionView }): SlideDraft<"MCQ"> {
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
