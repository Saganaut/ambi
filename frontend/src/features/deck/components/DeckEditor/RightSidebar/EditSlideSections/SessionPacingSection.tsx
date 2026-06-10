// Deck-wide default session pacing + answer settings surfaced in the edit-slide
// panel. Writes to deck.settings.answerSettings via useDeckSettings.
// Old fields (autoAdvance, showResponses, showScoresImmediately, speedBonus,
// timePerQuestion) have been replaced by the new nested DeckSettings structure.
// TODO: Wire showResponses and scoring fields once they are added to the new
// DeckSettings model (currently not present in AnswerSettings or PointSettings).
import { useState } from "react";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import type { ResultsDisplayMode } from "@deck/store/deckEnums.gen";
import { ResultsDisplayMode as ResultsDisplayModeEnum } from "@deck/store/deckEnums.gen";
import { RESULTS_DISPLAY_MODE_OPTIONS } from "../SettingsForms/settingsDefaults";
import { useDeckSettings } from "../useDeckSettings";
import styles from "../EditSlidePanel.module.css";

const DEFAULTS = {
  countdownTime: 15,
  shuffleOptions: false,
  displayResultsMode: ResultsDisplayModeEnum.ROUND_END,
};

interface PacingForm {
  countdownTime: number;
  shuffleOptions: boolean;
  displayResultsMode: ResultsDisplayMode;
}

const useSessionPacingSection = () => useDeckSettings();

const SessionPacingSection = () => {
  const { settings, commit, schedule, flush } = useSessionPacingSection();

  const answer = settings?.answerSettings;

  const seed = (): PacingForm => ({
    countdownTime: answer?.countdownTime ?? DEFAULTS.countdownTime,
    shuffleOptions: answer?.shuffleOptions ?? DEFAULTS.shuffleOptions,
    displayResultsMode:
      answer?.displayResultsMode ?? DEFAULTS.displayResultsMode,
  });

  const [form, setForm] = useState<PacingForm>(seed);
  const [synced, setSynced] = useState(!!settings);

  if (settings && !synced) {
    setSynced(true);
    setForm(seed());
  }

  if (!settings) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Pacing &amp; answers (deck default)</h4>
      <NumberInput
        id='session-countdown-time'
        label='Time per question (seconds)'
        min={0}
        max={3600}
        value={form.countdownTime}
        infoMessage='0 = unlimited (wait for players / host)'
        onChange={(next) => {
          setForm((f) => ({ ...f, countdownTime: next }));
          schedule({ answerSettings: { countdownTime: next } });
        }}
        onBlur={flush}
      />
      <Toggle
        id='session-shuffle-options'
        label='Shuffle answer options'
        checked={form.shuffleOptions}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setForm((f) => ({ ...f, shuffleOptions: next }));
          commit({ answerSettings: { shuffleOptions: next } });
        }}
      />
      <Dropdown
        id='session-display-results-mode'
        label='Show results to players'
        options={RESULTS_DISPLAY_MODE_OPTIONS}
        value={[form.displayResultsMode]}
        onChange={(vals) => {
          const next = vals[0] as ResultsDisplayMode | undefined;
          if (!next) return;
          setForm((f) => ({ ...f, displayResultsMode: next }));
          commit({ answerSettings: { displayResultsMode: next } });
        }}
      />
    </section>
  );
};

export { SessionPacingSection };
