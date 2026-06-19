// Per-slide point settings drawer. Same three-layer model as
// AnswerPanel (defaults ← deck default ← slide override); see that file
// for the full rationale. This panel only differs in the settings shape it
// wires: point settings instead of answer settings.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { PointSettings } from "@deck/store/deckApi.gen";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import { usePromotePointSettingsToDeckMutation } from "@deck/store/deckApi.gen";
import { useDeckQuery } from "@deck/hooks/useDeckQuery";
import { resolvePointSettings } from "../shared/settingsDefaults";
import slidePanel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "@deck/components/DeckEditor/RightSidebar/shared/SettingsPanel.module.css";
import { deckAndSlideIdProps } from "@/features/deck/deck.types";
import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { Toggle } from "@/shared/components/Forms/Input/Toggle/Toggle";
import { POINT_SETTINGS_DEFAULTS as D } from "../shared/settingsDefaults";



const QuizPanel = ({
  deckId,
  slideId,
}: deckAndSlideIdProps) => {
  const { pointSettings, schedulePointSettings, clearPointSettings, flush, cancel } =
    useSlideSettings(deckId, slideId);
  const { deck } = useDeckQuery(deckId);
  const isLoaded = deck != null;
  const deckSettings = deck?.settings;
  const [promotePointSettings] = usePromotePointSettingsToDeckMutation();

  const deckDefault = deckSettings?.pointSettings;
  const hasOverride = pointSettings != null;
  const effective = resolvePointSettings(deckDefault, pointSettings);
  const idPrefix = "slide-point"
  const disabled = false
  // Local mirror so typing reflects instantly while the slide write debounces.
  // Re-seed when the active slide changes so edits never bleed across slides.
  const [form, setForm] = useState<PointSettings>(effective);
  const [syncedKey, setSyncedKey] = useState(isLoaded ? slideId : undefined);
  // UI-only mirror of "is quiz mode showing". Derived from the persisted points,
  // but it stands in for it so the section's collapse can be *deferred to blur*
  // (blurPoints) — typing the Correct answer down to 0 mid-edit (e.g. clearing
  // the input to retype) no longer unmounts the section out from under the
  // cursor. Avoids adding a separate persisted flag.
  const [showQuizMode, setShowQuizMode] = useState((effective.points ?? 0) > 0);

  if (isLoaded && syncedKey !== slideId) {
    setSyncedKey(slideId);
    setForm(effective);
    setShowQuizMode((effective.points ?? 0) > 0);
  }

  if (!isLoaded) {
    return (
      <div className={slidePanel.empty}>
        <p>Loading deck settings…</p>
      </div>
    );
  }

  const handleChange = (
    patch: Partial<PointSettings>,
    { immediate }: { immediate: boolean },
  ) => {
    // Send the COMPLETE settings object, never a partial patch: the backend's
    // PointSettings fields are Java primitives that reject a null, so any field
    // omitted from the PUT fails deserialization. `form` is always fully
    // resolved (defaults <- deck <- slide), so merging the patch onto it keeps
    // every field populated.
    const next = { ...form, ...patch };
    setForm(next);
    schedulePointSettings(next);
    if (immediate) flush();
  };

  const applyToDeck = () => {
    // Cancel any buffered slide write first so it can't race the promote and
    // re-set the override that the backend is about to clear on all slides.
    cancel();
    void promotePointSettings({
      id: deckId,
      setPointSettingsRequest: { pointSettings: form },
    });
  };

  const resetToDeckDefault = () => {
    clearPointSettings();
    setForm(resolvePointSettings(deckDefault, undefined));
  };
  const number =
    (key: keyof PointSettings) => (next: number) => {
      handleChange({ [key]: next }, { immediate: false });
    };


  const toggleQuizMode = () => {
    if (showQuizMode) {
      setShowQuizMode(false);
      handleChange({ points: 0 }, { immediate: true });
    } else {
      setShowQuizMode(true);
      handleChange({ points: 10 }, { immediate: true });
    }
  };

  // Deferred collapse: only when the user commits the edit (blur) does a
  // Correct answer of 0 actually hide the section, so it stays put while typing.
  const blurPoints = () => {
    flush();
    if ((form.points ?? 0) <= 0) setShowQuizMode(false);
  };




  return (
    <div className={slidePanel.panel}>
      {hasOverride ? (
        <div className={styles.overrideHint}>
          <span>Overriding deck defaults</span>
          <Btn
            size='sm'
            fill='ghost'
            variant='secondary'
            onClick={resetToDeckDefault}>
            Reset
          </Btn>
        </div>
      ) : (
        <p className={styles.inherited}>
          Using the deck default. Edits below apply to this slide only.
        </p>
      )}

      <section className={slidePanel.section}>
        <Toggle
          labelPosition="labelBefore"
          id={`${idPrefix}-quiz-mode`}
          label='Quiz mode'
          disabled={disabled}
          checked={showQuizMode}
          onChange={toggleQuizMode}
        />

        {showQuizMode &&
          <>
            <NumberInput
              id={`${idPrefix}-points`}
              label='Correct answer'
              min={0}
              max={100000}
              disabled={disabled}
              value={form.points ?? D.points}
              onChange={number("points")}
              onBlur={blurPoints}
            />
            <NumberInput
              id={`${idPrefix}-fastest-points`}
              label='Fastest answer'
              min={0}
              max={100000}
              disabled={disabled}
              value={form.fastestCorrectAnswerPoints ?? D.fastestCorrectAnswerPoints}
              onChange={number("fastestCorrectAnswerPoints")}
              onBlur={flush}
            />
            <NumberInput
              id={`${idPrefix}-best-answer-points`}
              label='Best answer'
              min={0}
              max={100000}
              disabled={disabled}
              value={form.bestAnswerPoints ?? D.bestAnswerPoints}
              onChange={number("bestAnswerPoints")}
              onBlur={flush}
            />
            <NumberInput
              id={`${idPrefix}-deception-points`}
              label='Most deceitful'
              min={0}
              max={100000}
              disabled={disabled}
              value={form.deceptionPoints ?? D.deceptionPoints}
              infoMessage='Awarded when a player picks this answer believing it correct'
              onChange={number("deceptionPoints")}
              onBlur={flush}
            />
            <Toggle
              labelPosition="labelBefore"
              id={`${idPrefix}-reset-streak`}
              label='Reset streak when it ends'
              disabled={disabled}
              checked={form.resetStreakOnStreakEnd ?? D.resetStreakOnStreakEnd}
              onChange={(e) => {
                handleChange(
                  { resetStreakOnStreakEnd: e.currentTarget.checked },
                  { immediate: true },
                );
              }}
            />
          </>
        }
      </section>

      <div className={styles.footer}>
        <Tooltip
          className={styles.applyTooltip}
          label='Sets these as the deck default and removes all per-slide point-settings overrides, so every slide inherits this form.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to all slides
          </Btn>
        </Tooltip>
      </div>
    </div>
  );
};

export { QuizPanel };
