import { AxisQuestionView } from "@/features/deck/hooks/useAxisEditor";
import { useState } from "react";
import { ItemId, SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useAxisDraft({ question }: { question?: AxisQuestionView }): SlideDraft<"AXIS"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);
  const [tolerance, setTolerance] = useState(question?.tolerance ?? 0);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);

  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setTolerance(question.tolerance);
    setOpenMenuId(null);
    setSelectedItemId(null);
  }

  return {
    setPrompt,
    prompt,
    setTolerance,
    tolerance,
    setSelectedItemId,
    selectedItemId,
    setOpenMenuId,
    openMenuId,
    syncedFromId,
    setSyncedFromId,
  };
}
