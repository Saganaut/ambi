/**
 * Read/write boundary for a deck's settings (`DeckResponse.settings`). The
 * deck-editor right-sidebar panels (ParticipantsPanel, SessionPacingSection)
 * edit these deck-wide knobs, so the read-modify-write plumbing is centralised
 * here instead of duplicated per panel.
 *
 * `DeckSettings` is a nested object with sub-objects `pointSettings`,
 * `answerSettings`, and `audienceSettings`. Each `commit` deep-merges the
 * caller's partial patch so sibling sub-object edits don't clobber each other.
 */
import { getRouteApi } from "@tanstack/react-router";
import {
  type DeckSettings,
  useGetDeckQuery,
  useUpdateDeckMutation,
} from "@store/AmbiApi";
import { useDebouncedCommit } from "@hooks/useDebouncedCommit";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

type SettingsPatch = Partial<DeckSettings>;

interface DeckSettingsApi {
  /** The deck's current settings from the getDeck cache. Undefined while the
   *  deck is still loading. */
  settings: DeckSettings | undefined;
  /** Deep-merge `patch` onto the cached settings and PUT immediately. */
  commit: (patch: SettingsPatch) => void;
  /** Deep-merge `patch` onto the cached settings and PUT after a quiet delay. */
  schedule: (patch: SettingsPatch) => void;
  /** Fire any pending debounced write now. */
  flush: () => void;
}

const deepMergeSettings = (
  current: DeckSettings,
  patch: SettingsPatch,
): DeckSettings => ({
  ...current,
  ...patch,
  pointSettings:
    patch.pointSettings != null
      ? { ...current.pointSettings, ...patch.pointSettings }
      : current.pointSettings,
  answerSettings:
    patch.answerSettings != null
      ? { ...current.answerSettings, ...patch.answerSettings }
      : current.answerSettings,
  audienceSettings:
    patch.audienceSettings != null
      ? { ...current.audienceSettings, ...patch.audienceSettings }
      : current.audienceSettings,
});

const useDeckSettings = (delay = 500): DeckSettingsApi => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [updateDeck] = useUpdateDeckMutation();

  const commit = (patch: SettingsPatch) => {
    const next = deepMergeSettings(deck?.settings ?? {}, patch);
    void updateDeck({
      id: deckId,
      updateDeckRequest: { settings: next },
    })
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
    settings: deck?.settings,
    commit,
    schedule: scheduleCommit,
    flush,
  };
};

export { useDeckSettings };
export type { SettingsPatch };
