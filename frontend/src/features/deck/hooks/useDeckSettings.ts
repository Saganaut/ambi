/**
 * Read/write boundary for a deck's settings (`DeckResponse.settings`). The
 * deck-editor right-sidebar panels (ParticipantsPanel, SessionPacingSection, the
 * answer/point settings panels' "Apply to deck") edit these deck-wide knobs, so
 * the plumbing is centralised here instead of duplicated per panel.
 *
 * `DeckSettings` is a nested object with sub-objects `pointSettings`,
 * `answerSettings`, `audienceSettings`, and `inviteSettings`. Each is an
 * **embedded sub-document with its own dedicated endpoint** (`PUT
 * .../point-settings|answer-settings|audience-settings|invite-settings`),
 * persisted server-side via a targeted update that does NOT re-version the deck
 * — so two settings edits can't contend on the deck `@Version` the way the old
 * whole-deck `updateDeck` PATCH did. A `commit`/`schedule` patch is split by
 * sub-object and routed to the matching endpoint; the caller's partial
 * sub-object is deep-merged onto the cached full sub-object first, so the PUT
 * always carries a complete object (the backend records are primitives that
 * reject nulls).
 */
import { type DeckSettings, useGetDeckQuery, useSetDeckPointSettingsMutation, useSetDeckAnswerSettingsMutation, useSetDeckAudienceSettingsMutation, useSetDeckInviteSettingsMutation } from "@deck/store/deckApi.gen";
import { useDebouncedCommit } from "@hooks/useDebouncedCommit";

type SettingsPatch = Partial<DeckSettings>;

interface UseDeckSettingsResult {
  /** Whether the deck itself has loaded. Distinct from {@link settings} being
   *  defined: a loaded deck can still have no settings object at all, in which
   *  case `settings` is undefined but the deck is ready to edit. */
  isLoaded: boolean;
  /** The deck's current settings from the getDeck cache. Undefined while the
   *  deck is still loading OR when the deck simply has no settings yet. */
  settings: DeckSettings | undefined;
  /** Route each present sub-object to its dedicated endpoint immediately. */
  commit: (patch: SettingsPatch) => void;
  /** As {@link commit}, after a quiet delay. */
  schedule: (patch: SettingsPatch) => void;
  /** Fire any pending debounced write now. */
  flush: () => void;
}

const useDeckSettings = (deckId: string, delay = 500): UseDeckSettingsResult => {
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [setPointSettings] = useSetDeckPointSettingsMutation();
  const [setAnswerSettings] = useSetDeckAnswerSettingsMutation();
  const [setAudienceSettings] = useSetDeckAudienceSettingsMutation();
  const [setInviteSettings] = useSetDeckInviteSettingsMutation();

  const report = (err: unknown) =>
    console.error("Failed to update deck settings", err);

  // Split the patch by sub-object and PUT each through its own endpoint. Each is
  // merged onto the cached full sub-object so the body is always complete; the
  // three endpoints touch distinct sub-documents, so even simultaneous writes
  // never contend on the deck version.
  const commit = (patch: SettingsPatch) => {
    const current = deck?.settings;
    if (patch.pointSettings) {
      const pointSettings = { ...current?.pointSettings, ...patch.pointSettings };
      void setPointSettings({
        id: deckId,
        setPointSettingsRequest: { pointSettings },
      })
        .unwrap()
        .catch(report);
    }
    if (patch.answerSettings) {
      const answerSettings = {
        ...current?.answerSettings,
        ...patch.answerSettings,
      };
      void setAnswerSettings({
        id: deckId,
        setAnswerSettingsRequest: { answerSettings },
      })
        .unwrap()
        .catch(report);
    }
    if (patch.audienceSettings) {
      const audienceSettings = {
        ...current?.audienceSettings,
        ...patch.audienceSettings,
      };
      void setAudienceSettings({
        id: deckId,
        setAudienceSettingsRequest: { audienceSettings },
      })
        .unwrap()
        .catch(report);
    }
    if (patch.inviteSettings) {
      const inviteSettings = {
        ...current?.inviteSettings,
        ...patch.inviteSettings,
      };
      void setInviteSettings({
        id: deckId,
        setInviteSettingsRequest: { inviteSettings },
      })
        .unwrap()
        .catch(report);
    }
  };

  const { schedule: scheduleCommit, flush } = useDebouncedCommit<SettingsPatch>(
    commit,
    delay,
  );

  return {
    isLoaded: deck != null,
    settings: deck?.settings,
    commit,
    schedule: scheduleCommit,
    flush,
  };
};

export { useDeckSettings };
export type { SettingsPatch };
