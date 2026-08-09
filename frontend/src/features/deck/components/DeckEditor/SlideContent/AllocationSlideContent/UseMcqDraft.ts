import { McqQuestionView } from "@/features/deck/hooks/useMcqEditor";
import { SlideDraft, useSlideDraft } from "../_shared";

export function useMcqDraft({ question }: { question?: McqQuestionView }): SlideDraft<"MCQ"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question?.id, question?.prompt ?? "");

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
  };
}
