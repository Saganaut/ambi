/**
 * Base hook for resync, other slide specific hooks use this one and add their own setters
 */
import { useState } from "react";
import { QuestionViewBase, SlideDraft, SlideDraftBase } from "./Item.types";

const useSlideDraft = (question: QuestionViewBase | undefined): SlideDraftBase => {
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id ?? null);

  return {
    prompt,
    setPrompt,
    syncedFromId,
    setSyncedFromId,
    openMenuId,
    setOpenMenuId,
  };
};

export { useSlideDraft };
export type { SlideDraft };
