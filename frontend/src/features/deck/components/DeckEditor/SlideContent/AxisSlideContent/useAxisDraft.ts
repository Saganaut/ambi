import { AxisQuestionView } from "@/features/deck/hooks/useAxisEditor";
import { useState } from "react";
import { SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useAxisDraft({ question }: { question?: AxisQuestionView }): SlideDraft<"AXIS"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);
  const [tolerance, setTolerance] = useState(question?.tolerance ?? 0);
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
  }

  return {
    setPrompt,
    prompt,
    setTolerance,
    tolerance,
    setOpenMenuId,
    openMenuId,
    syncedFromId,
    setSyncedFromId,
  };
}
