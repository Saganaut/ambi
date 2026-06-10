// Controlled, presentational form for a slide- or deck-level AnswerSettings
// object. Owns no state and knows nothing about slide vs deck scope: the parent
// supplies the resolved `value` and decides where each patch lands. This is the
// half meant for reuse — the per-slide override panel and the future deck-wide
// settings panel both render this exact form.
//
// Two callback flavours so the parent can debounce typing but commit discrete
// switches immediately:
//   - toggles call onChange(patch, { immediate: true })
//   - number fields call onChange(patch, { immediate: false }) while typing and
//     onBlur() when focus leaves, so the parent can flush a pending write.
import type { AnswerSettings } from "@deck/store/deckApi.gen";
import type { ResultsDisplayMode } from "@deck/store/deckEnums.gen";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { Dropdown } from "@components/Forms/Input/Dropdown/Dropdown";
import {
  ANSWER_SETTINGS_DEFAULTS as D,
  RESULTS_DISPLAY_MODE_OPTIONS,
} from "./settingsDefaults";

interface AnswerSettingsFormProps {
  /** Resolved settings to display. Missing fields fall back to defaults. */
  value: AnswerSettings;
  /** Emit a field change. `immediate` is true for toggles, false for typing. */
  onChange: (
    patch: Partial<AnswerSettings>,
    opts: { immediate: boolean },
  ) => void;
  /** Focus left a number field — parent should flush any pending write. */
  onBlur?: () => void;
  /** Namespaces input ids so two instances can coexist on one page. */
  idPrefix: string;
  /** Disable every control (e.g. while the target is still loading). */
  disabled?: boolean;
}

const AnswerSettingsForm = ({
  value,
  onChange,
  onBlur,
  idPrefix,
  disabled,
}: AnswerSettingsFormProps) => {
  const toggle =
    (key: keyof AnswerSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange({ [key]: e.currentTarget.checked }, { immediate: true });
    };

  const number =
    (key: keyof AnswerSettings) => (next: number) => {
      onChange({ [key]: next }, { immediate: false });
    };

  return (
    <>
      <NumberInput
        id={`${idPrefix}-countdown-time`}
        label='Time per question (seconds)'
        min={0}
        max={3600}
        disabled={disabled}
        value={value.countdownTime ?? D.countdownTime}
        infoMessage='0 = unlimited (wait for players / host)'
        onChange={number("countdownTime")}
        onBlur={onBlur}
      />
      <Toggle
        id={`${idPrefix}-allow-multiple`}
        label='Allow multiple answers'
        disabled={disabled}
        checked={value.allowMultipleAnswers ?? D.allowMultipleAnswers}
        onChange={toggle("allowMultipleAnswers")}
      />
      <NumberInput
        id={`${idPrefix}-max-selections`}
        label='Max selections per player'
        min={1}
        max={50}
        disabled={disabled || !(value.allowMultipleAnswers ?? false)}
        value={value.maxSelections ?? D.maxSelections}
        onChange={number("maxSelections")}
        onBlur={onBlur}
      />
      <Toggle
        id={`${idPrefix}-shuffle-options`}
        label='Shuffle answer options'
        disabled={disabled}
        checked={value.shuffleOptions ?? D.shuffleOptions}
        onChange={toggle("shuffleOptions")}
      />
      <Dropdown
        id={`${idPrefix}-display-results-mode`}
        label='Show results to players'
        options={RESULTS_DISPLAY_MODE_OPTIONS}
        value={[value.displayResultsMode ?? D.displayResultsMode]}
        onChange={(vals) => {
          if (vals[0]) {
            onChange(
              { displayResultsMode: vals[0] as ResultsDisplayMode },
              { immediate: true },
            );
          }
        }}
      />
      <Toggle
        id={`${idPrefix}-anonymize-answers`}
        label='Anonymize answers'
        disabled={disabled}
        checked={value.anonymizeAnswers ?? D.anonymizeAnswers}
        onChange={toggle("anonymizeAnswers")}
      />
      <Toggle
        id={`${idPrefix}-allow-anonymous`}
        label='Allow anonymous responses'
        disabled={disabled}
        checked={value.allowAnonymous ?? D.allowAnonymous}
        onChange={toggle("allowAnonymous")}
      />
    </>
  );
};

export { AnswerSettingsForm };
export type { AnswerSettingsFormProps };
