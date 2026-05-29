// Participants drawer for the deck-editor right sidebar. Two scopes:
//   1. Deck-wide default session settings (who can join + how the audience can
//      engage) — `defaultSettings` on the deck, edited through useDeckSettings.
//      These are author suggestions a host may override at session-start.
//   2. The per-slide emoji-reactions opt-out — `chrome.reactionsEnabled` on the
//      active element, layered on top of the deck-wide reactions switch (a slide
//      can opt out even when reactions are on session-wide). It commits through
//      the same updateElement path used elsewhere in EditSlideSections so edits
//      stay in sync with the slide rail and live editor.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@/components/Common/Input/Toggle/Toggle";
import { NumberInput } from "@/components/Common/Input/NumberInput/NumberInput";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useGetDeckQuery,
  useUpdateElementMutation,
  type DeckResponse,
} from "@/store/AmbiApi";
import { useDeckSettings } from "./useDeckSettings";
import styles from "./EditSlidePanel.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

const routeApi = getRouteApi("/decks/$deckId/edit");

// Backend defaults (InteractiveSessionSettings) — kept in sync so a control
// shows the right state on a deck whose settings predate a given field.
const DEFAULTS = {
  maxPlayers: 8,
  allowGuests: true,
  allowLateJoin: false,
  allowReJoin: true,
  anonymousMode: false,
  chatEnabled: true,
  reactionsEnabled: true,
};

interface ParticipantForm {
  maxPlayers: number;
  allowGuests: boolean;
  allowLateJoin: boolean;
  allowReJoin: boolean;
  anonymousMode: boolean;
  chatEnabled: boolean;
  reactionsEnabled: boolean;
}

/** Deck-wide participant + engagement defaults. Local mirror gives toggles /
 *  the player-cap input instant feedback; updateDeck syncs the cache on the
 *  round-trip. Seeded once the deck loads, re-seeded if the deck changes. */
const DeckParticipantSettings = () => {
  const { deckId } = routeApi.useParams();
  const { settings, commit, schedule, flush } = useDeckSettings();

  const seed = (): ParticipantForm => ({
    maxPlayers: settings?.maxPlayers ?? DEFAULTS.maxPlayers,
    allowGuests: settings?.allowGuests ?? DEFAULTS.allowGuests,
    allowLateJoin: settings?.allowLateJoin ?? DEFAULTS.allowLateJoin,
    allowReJoin: settings?.allowReJoin ?? DEFAULTS.allowReJoin,
    anonymousMode: settings?.anonymousMode ?? DEFAULTS.anonymousMode,
    chatEnabled: settings?.chatEnabled ?? DEFAULTS.chatEnabled,
    reactionsEnabled: settings?.reactionsEnabled ?? DEFAULTS.reactionsEnabled,
  });

  const [form, setForm] = useState<ParticipantForm>(seed);
  const [syncedDeckId, setSyncedDeckId] = useState<string | undefined>(
    settings ? deckId : undefined,
  );

  // Re-seed when the deck's settings first arrive or the deck changes.
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
    commit({ [key]: next });
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
          value={form.maxPlayers}
          onChange={(next) => {
            setForm((f) => ({ ...f, maxPlayers: next }));
            schedule({ maxPlayers: next });
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

/** Per-slide reactions override (`chrome.reactionsEnabled`). Layered on top of
 *  the deck-wide reactions switch: a slide can opt out of reactions even when
 *  they're enabled session-wide. */
const SlideReactionsOverride = () => {
  const { deckId } = routeApi.useParams();
  const { questionId } = routeApi.useSearch();
  const currentUser = useCurrentUser();
  const currentUserId =
    currentUser.state === "registered" || currentUser.state === "guest"
      ? currentUser.user.id
      : undefined;

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => ({
        element: data?.elements?.find((e) => e.id === questionId),
      }),
    },
  );

  const [updateElement] = useUpdateElementMutation();

  const [reactionsEnabled, setReactionsEnabled] = useState<boolean>(
    element?.chrome?.reactionsEnabled ?? true,
  );
  const [syncedFromId, setSyncedFromId] = useState<string | undefined>(
    element?.id,
  );

  if (element && syncedFromId !== element.id) {
    setSyncedFromId(element.id);
    setReactionsEnabled(element.chrome?.reactionsEnabled ?? true);
  }

  if (!element) {
    return (
      <section className={styles.section}>
        <h4 className={styles.heading}>This slide</h4>
        <p className={styles.empty}>
          Select a slide to override reactions for it.
        </p>
      </section>
    );
  }

  const commit = (next: boolean) => {
    const stamped: DeckElement = {
      ...element,
      chrome: {
        ...element.chrome,
        reactionsEnabled: next,
        lastEditedByUserId: currentUserId,
        version: (element.chrome?.version ?? 0) + 1,
      },
    };
    void updateElement({
      id: deckId,
      elementId: element.id ?? "",
      body: stamped,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update reactions toggle", err);
      });
  };

  const elId = element.id ?? "";

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>This slide</h4>
      <Toggle
        id={`participants-reactions-${elId}`}
        label='Allow reactions on this slide'
        checked={reactionsEnabled}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setReactionsEnabled(next);
          commit(next);
        }}
      />
    </section>
  );
};

const ParticipantsPanel = () => {
  return (
    <div className={styles.panel}>
      <DeckParticipantSettings />
      <SlideReactionsOverride />
    </div>
  );
};

export { ParticipantsPanel };
