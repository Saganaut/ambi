import { useState } from "react";
import { SlideDraft, useSlideDraft } from "../components/DeckEditor/SlideContent/_shared";
import { AllocationQuestionView } from "./useAllocationEditor";

export function useAllocationDraft({
  question,
}: {
  question?: AllocationQuestionView;
  deckId: string;
}): SlideDraft<"ALLOCATION"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question?.id, question?.prompt ?? "");
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
  };
}
