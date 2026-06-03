// Deck-wide default session pacing + scoring knobs, surfaced in the edit-slide
// panel. Unlike the sibling sections in this folder (which edit the active
// element's chrome), these write the deck's `defaultSettings`
// (InteractiveSessionSettings) through useDeckSettings — they are author
// suggestions a host may override at session start, not per-slide values. The
// heading flags the deck-wide scope so it doesn't read as a per-slide control.
//
// Note the deliberate overlap with other surfaces: `showResponses` here is the
// session-settings copy, distinct from the per-element BehaviorSection control
// and the deck `defaultShowResponses` in ThemePanel; `timePerQuestion` is the
// deck-wide fallback that per-element `displaySeconds` overrides. See
// z-docs/to-do/finish-right-panel.md for the redundancy audit.
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import { useDeckSettings } from "../useDeckSettings";
import styles from "../EditSlidePanel.module.css";

type ShowResponsesMode = "INHERIT" | "INSTANT" | "ON_CLICK" | "PRIVATE";

const SHOW_RESPONSES_OPTIONS: { value: ShowResponsesMode; label: string }[] = [
  { value: "INHERIT", label: "Inherit (per-element)" },
  { value: "INSTANT", label: "Instant" },
  { value: "ON_CLICK", label: "On click" },
  { value: "PRIVATE", label: "Private" },
];

// Backend defaults (InteractiveSessionSettings) so a control reads correctly on
// a deck whose stored settings predate a field.
const DEFAULTS = {
  autoAdvance: false,
  showResponses: "INHERIT" as ShowResponsesMode,
  showScoresImmediately: true,
  speedBonus: true,
  timePerQuestion: 15,
};

interface PacingForm {
  autoAdvance: boolean;
  showResponses: ShowResponsesMode;
  showScoresImmediately: boolean;
  speedBonus: boolean;
  timePerQuestion: number;
}

const SessionPacingSection = () => {
  const { settings, commit, schedule, flush } = useDeckSettings();

  const seed = (): PacingForm => ({
    autoAdvance: settings?.autoAdvance ?? DEFAULTS.autoAdvance,
    showResponses: settings?.showResponses ?? DEFAULTS.showResponses,
    showScoresImmediately:
      settings?.showScoresImmediately ?? DEFAULTS.showScoresImmediately,
    speedBonus: settings?.speedBonus ?? DEFAULTS.speedBonus,
    timePerQuestion: settings?.timePerQuestion ?? DEFAULTS.timePerQuestion,
  });

  const [form, setForm] = useState<PacingForm>(seed);
  const [synced, setSynced] = useState<boolean>(!!settings);

  // Seed once the deck's settings arrive.
  if (settings && !synced) {
    setSynced(true);
    setForm(seed());
  }

  if (!settings) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Pacing &amp; scoring (deck default)</h4>
      <NumberInput
        id='session-time-per-question'
        label='Time per question (seconds)'
        min={0}
        max={3600}
        value={form.timePerQuestion}
        infoMessage='0 = unlimited (wait for players / host)'
        onChange={(next) => {
          setForm((f) => ({ ...f, timePerQuestion: next }));
          schedule({ timePerQuestion: next });
        }}
        onBlur={flush}
      />
      <Toggle
        id='session-auto-advance'
        label='Auto-advance rounds'
        checked={form.autoAdvance}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setForm((f) => ({ ...f, autoAdvance: next }));
          commit({ autoAdvance: next });
        }}
      />
      <Toggle
        id='session-speed-bonus'
        label='Speed bonus (faster answers score more)'
        checked={form.speedBonus}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setForm((f) => ({ ...f, speedBonus: next }));
          commit({ speedBonus: next });
        }}
      />
      <Toggle
        id='session-show-scores-immediately'
        label='Show scores immediately'
        checked={form.showScoresImmediately}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setForm((f) => ({ ...f, showScoresImmediately: next }));
          commit({ showScoresImmediately: next });
        }}
      />
      <div>
        <span className={styles.heading}>Show responses</span>
        <Dropdown
          options={SHOW_RESPONSES_OPTIONS.map((opt) => ({
            value: opt.value,
            label: opt.label,
          }))}
          value={[form.showResponses]}
          onChange={(values) => {
            const next = values[0] as ShowResponsesMode | undefined;
            if (!next || next === form.showResponses) return;
            setForm((f) => ({ ...f, showResponses: next }));
            commit({ showResponses: next });
          }}
        />
      </div>
    </section>
  );
};

export { SessionPacingSection };
