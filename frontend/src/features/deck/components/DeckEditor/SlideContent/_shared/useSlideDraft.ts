/**
 * Base hook for resync, other slide specific hooks use this one and add their own setters
 */
import { useState } from "react";
import { SlideDraft } from ".";
import { SlideDraftBase } from "./Item.types";

interface ComposerQuestion {
  id: string;
  prompt: string;
}

const useSlideDraft = (question: ComposerQuestion | undefined): SlideDraftBase => {
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
export type { ComposerQuestion, SlideDraft };
