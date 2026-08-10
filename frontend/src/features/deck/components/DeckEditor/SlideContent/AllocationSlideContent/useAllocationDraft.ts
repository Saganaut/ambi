import { useState } from "react";
import { AllocationQuestionView } from "../../../../hooks/useAllocationEditor";
import { SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useAllocationDraft({
  question,
}: {
  question?: AllocationQuestionView;
}): SlideDraft<"ALLOCATION"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);
  const [totalPoints, setTotalPoints] = useState(question?.totalPointsToAllocate ?? 100);
  const [tolerance, setTolerance] = useState(question?.tolerancePerItem ?? 0);

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
    syncedFromId,
    setSyncedFromId,
  };
}
