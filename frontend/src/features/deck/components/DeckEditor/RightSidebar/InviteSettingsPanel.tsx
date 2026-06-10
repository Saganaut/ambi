// Sharing / invite-display drawer for the deck-editor right sidebar. Deck-wide
// only (no per-slide override), mirroring ParticipantsPanel: it edits
// deck.settings.inviteSettings through useDeckSettings.
//
// The actual room code / invite token are minted per run on the LiveSession;
// these knobs only decide WHETHER and WHERE the join QR and room code are shown
// during a presentation. Every edit sends the COMPLETE InviteSettings object
// (not a field patch): the location lists are arrays, so we always send the
// fully-resolved form to avoid any ambiguity about partial array merges.
//
// Writes are debounced (schedule): toggling several surfaces in quick
// succession coalesces into one PUT of the final state, and any pending write
// flushes when the drawer unmounts (useDebouncedCommit).
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { Checkbox } from "@components/Forms/Input/Checkbox/Checkbox";
import type { InviteSettings } from "@deck/store/deckApi.gen";
import { DisplayLocation } from "@deck/store/deckEnums.gen";
import { useDeckSettings } from "./useDeckSettings";
import styles from "./EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

type Location = (typeof DisplayLocation)[keyof typeof DisplayLocation];

// Ordered, human-labelled surfaces — matches the backend DisplayLocation enum.
const LOCATIONS: { value: Location; label: string }[] = [
  { value: DisplayLocation.LOBBY, label: "Lobby" },
  { value: DisplayLocation.TITLE, label: "Title slides" },
  { value: DisplayLocation.HEADER, label: "Header (all slides)" },
  { value: DisplayLocation.SLIDES, label: "Content slides" },
  { value: DisplayLocation.RESULTS, label: "Results screen" },
];

// Defaults mirror the backend's DeckDefaultsProperties.Invite.
const DEFAULTS: Required<InviteSettings> = {
  enableQr: true,
  qrLocations: [DisplayLocation.LOBBY],
  showRoomCode: true,
  roomCodeLocations: [DisplayLocation.LOBBY, DisplayLocation.HEADER],
};

const LocationChecklist = ({
  idPrefix,
  selected,
  onToggle,
}: {
  idPrefix: string;
  selected: Location[];
  onToggle: (location: Location, on: boolean) => void;
}) => (
  <div className={styles.section}>
    {LOCATIONS.map(({ value, label }) => (
      <Checkbox
        key={value}
        id={`${idPrefix}-${value}`}
        label={label}
        checked={selected.includes(value)}
        onChange={(e) => {
          onToggle(value, e.currentTarget.checked);
        }}
      />
    ))}
  </div>
);

const InviteSettingsPanel = () => {
  const { deckId } = routeApi.useParams();
  const { settings, schedule } = useDeckSettings();

  const invite = settings?.inviteSettings;

  const seed = (): Required<InviteSettings> => ({
    enableQr: invite?.enableQr ?? DEFAULTS.enableQr,
    qrLocations: invite?.qrLocations ?? DEFAULTS.qrLocations,
    showRoomCode: invite?.showRoomCode ?? DEFAULTS.showRoomCode,
    roomCodeLocations: invite?.roomCodeLocations ?? DEFAULTS.roomCodeLocations,
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

  // Always PUT the entire InviteSettings object — see the file header. The local
  // form updates instantly; the server write is debounced.
  const apply = (next: Required<InviteSettings>) => {
    setForm(next);
    schedule({ inviteSettings: next });
  };

  const toggleLocation = (
    key: "qrLocations" | "roomCodeLocations",
    location: Location,
    on: boolean,
  ) => {
    const current = form[key];
    const next = on
      ? [...current, location]
      : current.filter((l) => l !== location);
    apply({ ...form, [key]: next });
  };

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Join QR code</h4>
        <Toggle
          id='invite-enable-qr'
          label='Show join QR code'
          checked={form.enableQr}
          onChange={(e) => {
            apply({ ...form, enableQr: e.currentTarget.checked });
          }}
        />
        {form.enableQr && (
          <LocationChecklist
            idPrefix='invite-qr'
            selected={form.qrLocations}
            onToggle={(location, on) => {
              toggleLocation("qrLocations", location, on);
            }}
          />
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Room code</h4>
        <Toggle
          id='invite-show-room-code'
          label='Show room code'
          checked={form.showRoomCode}
          onChange={(e) => {
            apply({ ...form, showRoomCode: e.currentTarget.checked });
          }}
        />
        {form.showRoomCode && (
          <LocationChecklist
            idPrefix='invite-room-code'
            selected={form.roomCodeLocations}
            onToggle={(location, on) => {
              toggleLocation("roomCodeLocations", location, on);
            }}
          />
        )}
      </section>
    </div>
  );
};

export { InviteSettingsPanel };
