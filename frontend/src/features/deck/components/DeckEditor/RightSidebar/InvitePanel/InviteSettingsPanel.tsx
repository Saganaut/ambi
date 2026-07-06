// Sharing / invite-display drawer for the deck-editor right sidebar. Deck-wide
// only (no per-slide override), mirroring ParticipantsPanel: it edits
// deck.settings.inviteSettings (read from useDeckQuery, written through
// useDeckSettingsMutate).
//
// The actual room code / invite token are minted per run on the LiveSession.
// The lobby always shows both the QR and room code (not configurable here —
// hiding join info from the one screen whose purpose is getting people to join
// makes no sense). These two independent toggles cover the other two surfaces:
// the persistent header (room code only — a QR needs real pixel size to be
// scannable, which a thin header strip can't offer) and the results screen
// (QR + room code shown together, since it's a full-screen surface like the
// lobby).
//
// Writes are debounced (schedule): toggling both in quick succession coalesces
// into one PUT of the final state, and any pending write flushes when the
// drawer unmounts (useDebouncedCommit).
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import type { InviteSettings } from "@deck/store/deckApi.gen";
import { useState } from "react";
import { useDeckQuery } from "../../../../hooks/useDeckQuery";
import { useDeckSettingsMutate } from "../../../../hooks/useDeckSettingsMutate";

// Defaults mirror the backend's DeckDefaultsProperties.Invite.
const DEFAULTS: Required<InviteSettings> = {
  showRoomCodeInHeader: true,
  showJoinInfoInResults: false,
};

const InviteSettingsPanel = ({ deckId }: { deckId: string }) => {
  const { deck } = useDeckQuery(deckId);
  const settings = deck?.settings;
  const { schedule } = useDeckSettingsMutate(deckId);

  const invite = settings?.inviteSettings;

  const seed = (): Required<InviteSettings> => ({
    showRoomCodeInHeader:
      invite?.showRoomCodeInHeader ?? DEFAULTS.showRoomCodeInHeader,
    showJoinInfoInResults:
      invite?.showJoinInfoInResults ?? DEFAULTS.showJoinInfoInResults,
  });

  // Local mirror so the UI reflects instantly; re-seed when the deck changes.
  const [form, setForm] = useState<Required<InviteSettings>>(seed);
  const [syncedDeckId, setSyncedDeckId] = useState<string | undefined>(
    settings ? deckId : undefined,
  );

  if (settings && syncedDeckId !== deckId) {
    setSyncedDeckId(deckId);
    setForm(seed());
  }

  if (!settings) {
    return (
      <div className={styles.empty}>
        <p>Loading deck settings…</p>
      </div>
    );
  }

  // Always PUT the entire InviteSettings object. The local form updates
  // instantly; the server write is debounced.
  const apply = (next: Required<InviteSettings>) => {
    setForm(next);
    schedule({ inviteSettings: next });
  };

  return (
    <div className={styles.panel}>
      <p className={styles.behaviorHint}>
        The lobby always shows the join QR code and room code.
      </p>
      <section className={styles.section}>
        <div className={styles.rows}>
          <Toggle
            labelPosition="labelBefore"
            id="invite-show-room-code-in-header"
            label="Show room code in header"
            checked={form.showRoomCodeInHeader}
            onChange={(e) => {
              apply({ ...form, showRoomCodeInHeader: e.currentTarget.checked });
            }}
          />
          <Toggle
            labelPosition="labelBefore"
            id="invite-show-join-info-in-results"
            label="Show join info on results screen"
            checked={form.showJoinInfoInResults}
            onChange={(e) => {
              apply({ ...form, showJoinInfoInResults: e.currentTarget.checked });
            }}
          />
        </div>
      </section>
    </div>
  );
};

export { InviteSettingsPanel };
