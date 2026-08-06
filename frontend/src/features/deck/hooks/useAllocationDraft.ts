import { useState } from "react";
import { AllocationQuestionView } from "./useAllocationEditor";

interface UseAllocationDraftResult {
  prompt: string;
  totalPoints: number;
  tolerance: number;
  openMenuId: string | null;
}

export function useAllocationDraft({
  question,
}: {
  question: AllocationQuestionView;
}): UseAllocationDraftResult {
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [totalPoints, setTotalPoints] = useState(question?.totalPointsToAllocate ?? 100);
  const [tolerance, setTolerance] = useState(question?.tolerancePerItem ?? 0);
  // Which option's menu is open — at most one per slide. Focusing an option's
  // label opens its menu (and thereby closes any other); the menu owns
  // dismissal.
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [syncedFromId, setSyncedFromId] = useState(question?.id);
  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setTotalPoints(question.totalPointsToAllocate);
    setTolerance(question.tolerancePerItem);
    setOpenMenuId(null);
  }

  return {
    prompt,
    totalPoints,
    tolerance,
    openMenuId,
  };
}
