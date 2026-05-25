// Form-state hook for the Slide audience/display options panel. Collapses ten
// individual `useState` mirrors into one object + a merging updater, and folds
// the manual "if syncedFromId !== element.id, reset every mirror" cascade into
// a single resync call. Pure form-state — actual commit plumbing stays on
// useElementEditor at the call site.
import { useState } from "react";
import type { Slide } from "@/store/BrainFlexApi";

type ResultsDisplayValue = NonNullable<Slide["resultsDisplayType"]>;

interface SlideOptionsForm {
  resultsDisplayType: ResultsDisplayValue;
  multipleSelectionsEnabled: boolean;
  selectionsPerParticipant: number;
  showResultsAsPercentage: boolean;
  // chunk 21 — joinType is the legacy single-source enum. New documents carry
  // showJoinInformation and showQrCode independently; older documents fall
  // back to deriving showQrCode from joinType === "QR_CODE".
  showJoinInformation: boolean;
  showQrCode: boolean;
  heading: string;
  // RichTextInput consumes/produces an HTML string today, but the backend
  // field is a TipTap/ProseMirror JSON doc. Until the picker round-trips JSON
  // we store the HTML in `participantInformation.html` as a one-key Map; a
  // later codegen pass will swap this for the proper TipTap shape.
  participantInformationHtml: string;
  // chunk 10: null means the host clicks Next manually.
  autoAdvanceEnabled: boolean;
  autoAdvanceSeconds: number;
}

const fromElement = (element: Slide | undefined): SlideOptionsForm => ({
  resultsDisplayType: element?.resultsDisplayType ?? "DEFAULT",
  multipleSelectionsEnabled: element?.multipleSelectionsEnabled ?? false,
  selectionsPerParticipant: element?.selectionsPerParticipant ?? 1,
  showResultsAsPercentage: element?.showResultsAsPercentage ?? false,
  showJoinInformation: element?.showJoinInformation ?? true,
  showQrCode: element?.showQrCode ?? element?.joinType === "QR_CODE",
  heading: element?.heading ?? "",
  participantInformationHtml:
    typeof element?.participantInformation?.html === "string"
      ? element.participantInformation.html
      : "",
  autoAdvanceEnabled: element?.autoAdvanceSeconds !== undefined,
  autoAdvanceSeconds: element?.autoAdvanceSeconds ?? 30,
});

interface UseSlideOptionsFormResult {
  form: SlideOptionsForm;
  /** Merge `patch` into form state and return the next form (so callers
   *  can pass it into `buildPatch` without waiting a render cycle). */
  patch: (patch: Partial<SlideOptionsForm>) => SlideOptionsForm;
  /** Idempotently snap the form back to the current element's values. Call
   *  during render when `element.id !== syncedFromId`. */
  resync: (element: Slide) => void;
}

const useSlideOptionsForm = (
  element: Slide | undefined,
): UseSlideOptionsFormResult => {
  const [form, setForm] = useState<SlideOptionsForm>(() => fromElement(element));

  const patch = (next: Partial<SlideOptionsForm>): SlideOptionsForm => {
    const merged = { ...form, ...next };
    setForm(merged);
    return merged;
  };

  const resync = (next: Slide) => {
    setForm(fromElement(next));
  };

  return { form, patch, resync };
};

export { useSlideOptionsForm };
export type { SlideOptionsForm };
