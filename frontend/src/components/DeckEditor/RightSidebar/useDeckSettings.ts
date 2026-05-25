/**
 * Read/write boundary for a deck's author-suggested default session settings
 * (the `InteractiveSessionSettings` embedded on the deck's PlayableContent,
 * surfaced as `DeckResponse.defaultSettings`). The deck-editor right-sidebar
 * panels (ParticipantsPanel, EditSlidePanel) edit these deck-wide knobs, so the
 * read-modify-write plumbing is centralised here instead of duplicated per panel.
 *
 * Why a whole-object write: `UpdateDeckRequest.defaultSettings` replaces the
 * settings object wholesale (null leaves it unchanged). So every `commit` merges
 * the caller's partial patch onto the freshest cached settings and PUTs the full
 * object — concurrent edits from sibling controls read the latest cache, never a
 * stale snapshot. `updateDeck` syncs the `getDeck` cache on success (see
 * `enhancements/deck.ts`), so consuming controls keep their own local mirror for
 * instant feedback during the round-trip.
 *
 * Mirrors `useElementEditor`'s schedule/flush/commit shape: `commit` fires the
 * PUT immediately (toggles, dropdowns), `schedule` debounces it (number inputs),
 * `flush` drains a pending debounced write (typical: onBlur).
 */
import { getRouteApi } from "@tanstack/react-router";
import {
  useGetDeckQuery,
  useUpdateDeckMutation,
  type InteractiveSessionSettings,
} from "@/store/BrainFlexApi";
import { useDebouncedCommit } from "@/hooks/useDebouncedCommit";

const routeApi = getRouteApi("/decks/$deckId/edit");

type SettingsPatch = Partial<InteractiveSessionSettings>;

interface DeckSettingsApi {
  /** The deck's current default settings from the getDeck cache. Undefined
   *  while the deck is still loading. */
  settings: InteractiveSessionSettings | undefined;
  /** Merge `patch` onto the cached settings and PUT immediately. */
  commit: (patch: SettingsPatch) => void;
  /** Merge `patch` onto the cached settings and PUT after a quiet delay. */
  schedule: (patch: SettingsPatch) => void;
  /** Fire any pending debounced write now. */
  flush: () => void;
}

const useDeckSettings = (delay = 500): DeckSettingsApi => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [updateDeck] = useUpdateDeckMutation();

  const commit = (patch: SettingsPatch) => {
    // Read-modify-write against the freshest cache so a sibling control's
    // in-flight change isn't clobbered by this one.
    const next: InteractiveSessionSettings = {
      ...(deck?.defaultSettings ?? {}),
      ...patch,
    };
    void updateDeck({ id: deckId, updateDeckRequest: { defaultSettings: next } })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update deck settings", err);
      });
  };

  const { schedule: scheduleCommit, flush } = useDebouncedCommit<SettingsPatch>(
    commit,
    delay,
  );

  return {
    settings: deck?.defaultSettings,
    commit,
    schedule: scheduleCommit,
    flush,
  };
};

export { useDeckSettings };
export type { SettingsPatch };
