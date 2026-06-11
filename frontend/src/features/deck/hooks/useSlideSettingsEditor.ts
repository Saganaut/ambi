// Editing layer for a single slide's PointSettings + AnswerSettings.
//
// Sits on top of {@link useSlide} (which owns the slide collection and reads the
// `listSlides` cache) the same way {@link useSlideEditor} does — the active
// slide already carries both settings on `slide.settings`, so reads come from
// the cache and never need a separate GET. Writes do NOT fold into the slide PUT
// though: point/answer settings have their own dedicated endpoints (like the
// cover/background image slots), so editing them never round-trips the whole
// slide's content.
//
// Commits are debounced (see {@link useDebouncedCommit}): rapid edits across
// several fields in one settings object accumulate into a single PUT once
// editing goes quiet, or immediately on {@link flush} (bind to `onBlur` /
// before a structural change). Point and answer settings buffer independently —
// editing one never schedules a write for the other.
//
// Every field on both PointSettings and AnswerSettings is optional, so a partial
// merge is itself a structurally valid settings object: there is no need to seed
// defaults before the first edit.
import { useRef } from "react";
import { useSetSlidePointSettingsMutation, useSetSlideAnswerSettingsMutation, useClearSlidePointSettingsMutation, useClearSlideAnswerSettingsMutation, type AnswerSettings, type PointSettings } from "@deck/store/deckApi.gen";
import { useDebouncedCommit } from "@/shared/hooks/useDebouncedCommit";
import { useSlide } from "./useSlide";

interface UseSlideSettingsEditorResult {
  /** The active slide's point settings from the cache (undefined until set). */
  pointSettings: PointSettings | undefined;
  /** The active slide's answer settings from the cache (undefined until set). */
  answerSettings: AnswerSettings | undefined;
  /**
   * Shallow-merge a patch onto the slide's point settings (debounced). Pass a
   * function to derive the patch from the freshest pending value (the
   * accumulated draft if one exists, else the live cache), so back-to-back
   * writes inside one debounce window build on each other instead of each
   * starting from the same stale render snapshot.
   */
  updatePointSettings: (
    patch:
      | Partial<PointSettings>
      | ((prev: PointSettings) => Partial<PointSettings>),
  ) => void;
  /** As {@link updatePointSettings}, for answer settings. */
  updateAnswerSettings: (
    patch:
      | Partial<AnswerSettings>
      | ((prev: AnswerSettings) => Partial<AnswerSettings>),
  ) => void;
  /** Drop any pending point edit and clear the slide's point settings. */
  clearPointSettings: () => void;
  /** Drop any pending answer edit and clear the slide's answer settings. */
  clearAnswerSettings: () => void;
  /** Flush any pending debounced edit (point and answer) immediately. */
  flush: () => void;
  /**
   * Cancel any pending debounced writes without flushing or firing any
   * mutation. Use before a promote-to-deck call so the buffered slide write
   * can't race the promote and re-set the just-cleared override.
   */
  cancelPendingWrites: () => void;
}

const useSlideSettingsEditor = (
  deckId: string,
  slideId: string,
): UseSlideSettingsEditorResult => {
  const { getSlide } = useSlide(deckId);
  const slide = getSlide(slideId);
  const settings = slide?.settings;

  const [setPointSettings] = useSetSlidePointSettingsMutation();
  const [setAnswerSettings] = useSetSlideAnswerSettingsMutation();
  const [clearPointSettingsMutation] = useClearSlidePointSettingsMutation();
  const [clearAnswerSettingsMutation] = useClearSlideAnswerSettingsMutation();

  // Accumulated, not-yet-committed value per settings object. Lets rapid edits
  // to different fields coalesce into one PUT instead of each merge starting
  // from a stale cache read. Reset on commit and whenever the slide changes.
  const pointDraftRef = useRef<PointSettings | null>(null);
  const answerDraftRef = useRef<AnswerSettings | null>(null);
  const syncedIdRef = useRef<string | null>(null);

  const point = useDebouncedCommit<PointSettings>((pointSettings) => {
    void setPointSettings({
      id: deckId,
      slideId,
      setPointSettingsRequest: { pointSettings },
    });
    pointDraftRef.current = null;
  });

  const answer = useDebouncedCommit<AnswerSettings>((answerSettings) => {
    void setAnswerSettings({
      id: deckId,
      slideId,
      setAnswerSettingsRequest: { answerSettings },
    });
    answerDraftRef.current = null;
  });

  // Drop any pending drafts when the editor switches slides so edits never
  // bleed from one slide into the next.
  if (syncedIdRef.current !== slideId) {
    syncedIdRef.current = slideId;
    pointDraftRef.current = null;
    answerDraftRef.current = null;
  }

  const updatePointSettings = (
    patch:
      | Partial<PointSettings>
      | ((prev: PointSettings) => Partial<PointSettings>),
  ) => {
    if (!slide) return;
    // Merge onto the freshest value: a pending draft if one exists, else the
    // live cache (or `{}` before the slide has any point settings).
    const base = pointDraftRef.current ?? settings?.pointSettings ?? {};
    const resolved = typeof patch === "function" ? patch(base) : patch;
    const next = { ...base, ...resolved };
    pointDraftRef.current = next;
    point.schedule(next);
  };

  const updateAnswerSettings = (
    patch:
      | Partial<AnswerSettings>
      | ((prev: AnswerSettings) => Partial<AnswerSettings>),
  ) => {
    if (!slide) return;
    const base = answerDraftRef.current ?? settings?.answerSettings ?? {};
    const resolved = typeof patch === "function" ? patch(base) : patch;
    const next = { ...base, ...resolved };
    answerDraftRef.current = next;
    answer.schedule(next);
  };

  const clearPointSettings = () => {
    // Drop the pending draft so the debounce can't re-set what we just cleared.
    point.cancel();
    pointDraftRef.current = null;
    void clearPointSettingsMutation({ id: deckId, slideId });
  };

  const clearAnswerSettings = () => {
    answer.cancel();
    answerDraftRef.current = null;
    void clearAnswerSettingsMutation({ id: deckId, slideId });
  };

  const flush = () => {
    point.flush();
    answer.flush();
  };

  const cancelPendingWrites = () => {
    point.cancel();
    pointDraftRef.current = null;
    answer.cancel();
    answerDraftRef.current = null;
  };

  return {
    pointSettings: settings?.pointSettings,
    answerSettings: settings?.answerSettings,
    updatePointSettings,
    updateAnswerSettings,
    clearPointSettings,
    clearAnswerSettings,
    flush,
    cancelPendingWrites,
  };
};

export { useSlideSettingsEditor };
export type { UseSlideSettingsEditorResult };
