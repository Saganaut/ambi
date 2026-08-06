import { Dispatch, SetStateAction, useState } from "react";
import { AllocationQuestionView } from "./useAllocationEditor";

interface UseAllocationDraftResult {
  setPrompt: Dispatch<SetStateAction<string>>;
  prompt: string;
  setTotalPoints: Dispatch<SetStateAction<number>>;
  totalPoints: number;
  setTolerance: Dispatch<SetStateAction<number>>;
  tolerance: number;
  setOpenMenuId: Dispatch<SetStateAction<string | null>>;

  openMenuId: string | null;
}

export function useAllocationDraft({
  question,
}: {
  question?: AllocationQuestionView;
}): UseAllocationDraftResult {
  const [prompt, setPrompt] = useState(question?.prompt ?? "");
  const [totalPoints, setTotalPoints] = useState(question?.totalPointsToAllocate ?? 100);
  const [tolerance, setTolerance] = useState(question?.tolerancePerItem ?? 0);
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
    setPrompt,
    prompt,
    setTotalPoints,
    totalPoints,
    setTolerance,
    tolerance,
    setOpenMenuId,
    openMenuId,
  };
}
