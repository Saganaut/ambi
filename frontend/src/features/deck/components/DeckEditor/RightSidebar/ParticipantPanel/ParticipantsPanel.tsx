// Participants drawer for the deck-editor right sidebar. Two scopes:
//   1. Deck-wide audience settings (who can join + how the audience can engage)
//      via deck.settings.audienceSettings through useDeckSettings.
//   2. Per-slide reactions override — TODO: wire once slide-level overrides
//      are supported in the new slide model.
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useDeckSettings } from "../../../../hooks/useDeckSettings";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import { deckAndSlideIdProps } from "@/features/deck/deck.types";

const DEFAULTS = {
  maxParticipants: 8,
  allowGuests: true,
  allowLateJoin: false,
  allowReJoin: true,
  anonymousMode: false,
  chatEnabled: true,
  reactionsEnabled: true,
};

interface ParticipantForm {
  maxParticipants: number;
  allowGuests: boolean;
  allowLateJoin: boolean;
  allowReJoin: boolean;
  anonymousMode: boolean;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
}

const useParticipantsPanel = (deckId: string) => useDeckSettings(deckId);

const DeckParticipantSettings = ({ deckId }: { deckId: string }) => {
  const { settings, commit, schedule, flush } = useParticipantsPanel(deckId);

  const audience = settings?.audienceSettings;

  const seed = (): ParticipantForm => ({
    maxParticipants: audience?.maxParticipants ?? DEFAULTS.maxParticipants,
    allowGuests: audience?.allowGuests ?? DEFAULTS.allowGuests,
    allowLateJoin: audience?.allowLateJoin ?? DEFAULTS.allowLateJoin,
    allowReJoin: audience?.allowReJoin ?? DEFAULTS.allowReJoin,
    anonymousMode: audience?.anonymousMode ?? DEFAULTS.anonymousMode,
    chatEnabled: audience?.chatEnabled ?? DEFAULTS.chatEnabled,
    reactionsEnabled: audience?.reactionsEnabled ?? DEFAULTS.reactionsEnabled,
  });

  const [form, setForm] = useState<ParticipantForm>(seed);
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

  const toggle = (key: keyof ParticipantForm, next: boolean) => {
    setForm((f) => ({ ...f, [key]: next }));
    commit({ audienceSettings: { [key]: next } });
  };

  return (
    <>
      <section className={styles.section}>
        <h4 className={styles.heading}>Who can join</h4>
        <NumberInput
          id='participants-max-players'
          label='Maximum players'
          min={1}
          max={1000}
          value={form.maxParticipants}
          onChange={(next) => {
            setForm((f) => ({ ...f, maxParticipants: next }));
            schedule({ audienceSettings: { maxParticipants: next } });
          }}
          onBlur={flush}
        />
        <Toggle
          id='participants-allow-guests'
          label='Allow guests (no account)'
          checked={form.allowGuests}
          onChange={(e) => {
            toggle("allowGuests", e.currentTarget.checked);
          }}
        />
        <Toggle
          id='participants-allow-late-join'
          label='Allow late join'
          checked={form.allowLateJoin}
          onChange={(e) => {
            toggle("allowLateJoin", e.currentTarget.checked);
          }}
        />
        <Toggle
          id='participants-allow-rejoin'
          label='Allow players to rejoin'
          checked={form.allowReJoin}
          onChange={(e) => {
            toggle("allowReJoin", e.currentTarget.checked);
          }}
        />
        <Toggle
          id='participants-anonymous-mode'
          label='Anonymous mode (hide real names)'
          checked={form.anonymousMode}
          onChange={(e) => {
            toggle("anonymousMode", e.currentTarget.checked);
          }}
        />
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Audience engagement</h4>
        <Toggle
          id='participants-chat-enabled'
          label='Enable chat'
          checked={form.chatEnabled}
          onChange={(e) => {
            toggle("chatEnabled", e.currentTarget.checked);
          }}
        />
        <Toggle
          id='participants-reactions-enabled'
          label='Allow emoji reactions (all slides)'
          checked={form.reactionsEnabled}
          onChange={(e) => {
            toggle("reactionsEnabled", e.currentTarget.checked);
          }}
        />
      </section>
    </>
  );
};

const SlideReactionsOverride = ({ deckId, slideId }: deckAndSlideIdProps) => {
  // TODO: Wire per-slide reactions override once the new slide model supports
  // slide-level audience settings. The old chrome.reactionsEnabled field and
  // useUpdateElementMutation are no longer available.
  const _deckId = deckId
  const _slideId = slideId
  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>This slide</h4>
      <p className={styles.empty}>
        Per-slide reaction overrides are not yet available in the new slide
        model.
      </p>
    </section>
  );
};

const ParticipantsPanel = ({ deckId, slideId }: deckAndSlideIdProps) => (
  <div className={styles.panel}>
    <DeckParticipantSettings deckId={deckId} />
    <SlideReactionsOverride slideId={slideId} deckId={deckId} />
  </div>
);

export { ParticipantsPanel };
