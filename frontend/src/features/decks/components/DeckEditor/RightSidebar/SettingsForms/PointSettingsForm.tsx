// Controlled, presentational form for a slide- or deck-level PointSettings
// object. Mirror of AnswerSettingsForm — same controlled contract, same scope
// agnosticism — so both the per-slide override panel and the future deck-wide
// panel can render it. See AnswerSettingsForm for the callback rationale.
//
// `streakBonuses` (a milestone map) is intentionally left out for now: it needs
// a repeating-row editor rather than a flat field. The scalar streak toggle is
// here; the map editor is a TODO once that UX is designed.
import type { PointSettings } from "@store/AmbiApi";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { POINT_SETTINGS_DEFAULTS as D } from "./settingsDefaults";

interface PointSettingsFormProps {
  /** Resolved settings to display. Missing fields fall back to defaults. */
  value: PointSettings;
  /** Emit a field change. `immediate` is true for toggles, false for typing. */
  onChange: (
    patch: Partial<PointSettings>,
    opts: { immediate: boolean },
  ) => void;
  /** Focus left a number field — parent should flush any pending write. */
  onBlur?: () => void;
  /** Namespaces input ids so two instances can coexist on one page. */
  idPrefix: string;
  /** Disable every control (e.g. while the target is still loading). */
  disabled?: boolean;
}

const PointSettingsForm = ({
  value,
  onChange,
  onBlur,
  idPrefix,
  disabled,
}: PointSettingsFormProps) => {
  const number =
    (key: keyof PointSettings) => (next: number) => {
      onChange({ [key]: next }, { immediate: false });
    };

  return (
    <>
      <NumberInput
        id={`${idPrefix}-points`}
        label='Points for a correct answer'
        min={0}
        max={100000}
        disabled={disabled}
        value={value.points ?? D.points}
        onChange={number("points")}
        onBlur={onBlur}
      />
      <NumberInput
        id={`${idPrefix}-fastest-points`}
        label='Bonus for the fastest correct answer'
        min={0}
        max={100000}
        disabled={disabled}
        value={value.fastestCorrectAnswerPoints ?? D.fastestCorrectAnswerPoints}
        onChange={number("fastestCorrectAnswerPoints")}
        onBlur={onBlur}
      />
      <NumberInput
        id={`${idPrefix}-best-answer-points`}
        label='Bonus for the best answer'
        min={0}
        max={100000}
        disabled={disabled}
        value={value.bestAnswerPoints ?? D.bestAnswerPoints}
        onChange={number("bestAnswerPoints")}
        onBlur={onBlur}
      />
      <NumberInput
        id={`${idPrefix}-deception-points`}
        label='Points for deceiving other players'
        min={0}
        max={100000}
        disabled={disabled}
        value={value.deceptionPoints ?? D.deceptionPoints}
        infoMessage='Awarded when a player picks this answer believing it correct'
        onChange={number("deceptionPoints")}
        onBlur={onBlur}
      />
      <Toggle
        id={`${idPrefix}-reset-streak`}
        label='Reset streak when a streak ends'
        disabled={disabled}
        checked={value.resetStreakOnStreakEnd ?? D.resetStreakOnStreakEnd}
        onChange={(e) => {
          onChange(
            { resetStreakOnStreakEnd: e.currentTarget.checked },
            { immediate: true },
          );
        }}
      />
    </>
  );
};

export { PointSettingsForm };
export type { PointSettingsFormProps };
