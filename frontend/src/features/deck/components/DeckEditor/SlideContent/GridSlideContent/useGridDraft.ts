import { GridQuestionView } from "@/features/deck/hooks/useGridEditor";
import { useState } from "react";
import { ItemId, SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useGridDraft({ question }: { question?: GridQuestionView }): SlideDraft<"GRID"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);
  const [selectedItemId, setSelectedItemId] = useState<ItemId | null>(null);

  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setOpenMenuId(null);
    setSelectedItemId(null);
  }

  return {
    setPrompt,
    prompt,
    setSelectedItemId,
    selectedItemId,
    setOpenMenuId,
    openMenuId,
    syncedFromId,
    setSyncedFromId,
  };
}
