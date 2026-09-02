import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import type { InviteSettings } from "@deck/store/deckApi.gen";
import { Toggle } from "@saganaut/ambi-ui";
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
    showRoomCodeInHeader: invite?.showRoomCodeInHeader ?? DEFAULTS.showRoomCodeInHeader,
    showJoinInfoInResults: invite?.showJoinInfoInResults ?? DEFAULTS.showJoinInfoInResults,
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
      <p className={styles.behaviorHint}>The lobby always shows the join QR code and room code.</p>
      <section className={styles.section}>
        <div className={styles.rows}>
          <Toggle
            id="invite-show-room-code-in-header"
            label="Show room code in header"
            checked={form.showRoomCodeInHeader}
            onChange={(e) => {
              apply({ ...form, showRoomCodeInHeader: e.currentTarget.checked });
            }}
          />
          <Toggle
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
