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
import { useDeckSettings } from "../../../../hooks/useDeckSettings";
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
  const { pointSettings, updatePointSettings, clearPointSettings, flush, cancelPendingWrites } =
    useSlideSettings(deckId, slideId);
  const { isLoaded, settings: deckSettings } = useDeckSettings(deckId);
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

  if (isLoaded && syncedKey !== slideId) {
    setSyncedKey(slideId);
    setForm(effective);
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
    updatePointSettings(next);
    if (immediate) flush();
  };

  const applyToDeck = () => {
    // Cancel any buffered slide write first so it can't race the promote and
    // re-set the override that the backend is about to clear on all slides.
    cancelPendingWrites();
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
  return (
    <div className={slidePanel.panel}>
      {hasOverride ? (
        <div className={styles.overrideHint}>
          <span>Overriding the deck default for this slide.</span>
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

        <>
          <NumberInput
            id={`${idPrefix}-points`}
            label='Points for a correct answer'
            min={0}
            max={100000}
            disabled={disabled}
            value={form.points ?? D.points}
            onChange={number("points")}
            onBlur={flush}
          />
          <NumberInput
            id={`${idPrefix}-fastest-points`}
            label='Bonus for the fastest correct answer'
            min={0}
            max={100000}
            disabled={disabled}
            value={form.fastestCorrectAnswerPoints ?? D.fastestCorrectAnswerPoints}
            onChange={number("fastestCorrectAnswerPoints")}
            onBlur={flush}
          />
          <NumberInput
            id={`${idPrefix}-best-answer-points`}
            label='Bonus for the best answer'
            min={0}
            max={100000}
            disabled={disabled}
            value={form.bestAnswerPoints ?? D.bestAnswerPoints}
            onChange={number("bestAnswerPoints")}
            onBlur={flush}
          />
          <NumberInput
            id={`${idPrefix}-deception-points`}
            label='Points for deceiving other players'
            min={0}
            max={100000}
            disabled={disabled}
            value={form.deceptionPoints ?? D.deceptionPoints}
            infoMessage='Awarded when a player picks this answer believing it correct'
            onChange={number("deceptionPoints")}
            onBlur={flush}
          />
          <Toggle
            id={`${idPrefix}-reset-streak`}
            label='Reset streak when a streak ends'
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
      </section>

      <div className={styles.footer}>
        <Tooltip
          className={styles.applyTooltip}
          label='Sets these as the deck default and removes all per-slide point-settings overrides, so every slide inherits this form.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to deck
          </Btn>
        </Tooltip>
      </div>
    </div>
  );
};

export { QuizPanel };
