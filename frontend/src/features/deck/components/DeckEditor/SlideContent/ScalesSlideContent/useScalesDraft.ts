import { ScalesQuestionView } from "@/features/deck/hooks/useScalesEditor";
import { useState } from "react";
import { SlideDraft } from "../_shared/Item.types";
import { useSlideDraft } from "../_shared/useSlideDraft";

export function useScalesDraft({
  question,
}: {
  question?: ScalesQuestionView;
}): SlideDraft<"SCALES"> {
  const { prompt, setPrompt, openMenuId, setOpenMenuId, syncedFromId, setSyncedFromId } =
    useSlideDraft(question);
  const [min, setMin] = useState(question?.min ?? 1);
  const [max, setMax] = useState(question?.max ?? 5);
  const [leftLabel, setLeftLabel] = useState(question?.leftLabel ?? "");
  const [rightLabel, setRightLabel] = useState(question?.rightLabel ?? "");

  if (question && syncedFromId !== question.id) {
    setSyncedFromId(question.id);
    setPrompt(question.prompt);
    setMin(question.min);
    setMax(question.max);
    setLeftLabel(question.leftLabel);
    setRightLabel(question.rightLabel);
    setOpenMenuId(null);
  }

  return {
    setPrompt,
    prompt,
    setMin,
    min,
    setMax,
    max,
    setLeftLabel,
    leftLabel,
    setRightLabel,
    rightLabel,
    setOpenMenuId,
    openMenuId,
    syncedFromId,
    setSyncedFromId,
  };
}
