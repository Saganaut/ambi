// Per-slide answer settings drawer. Three-layer model:
//   - The form shows the effective value: hardcoded defaults ← deck default ←
//     this slide's override (resolveAnswerSettings).
//   - Editing a field writes a *slide override* (useSlideSettingsEditor) so the
//     change applies to this slide only.
//   - "Apply to deck" promotes the current values to the deck-wide default
//     (useDeckSettings) and drops the now-redundant slide override, so the slide
//     simply inherits the new default.
//   - "Reset to deck default" clears the override when one exists.
//
// The form itself is the reusable AnswerSettingsForm; this panel is only the
// slide/deck wiring around it.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { AnswerSettings } from "@deck/store/deckApi.gen";
import { useSlideSettingsEditor } from "@deck/hooks/useSlideSettingsEditor";
import { usePromoteAnswerSettingsToDeckMutation } from "@deck/store/deckApiPromote";
import { useDeckSettings } from "../useDeckSettings";
import { resolveAnswerSettings, RESULTS_DISPLAY_MODE_OPTIONS } from "../SettingsForms/settingsDefaults";
import slidePanel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "../SettingsForms/SettingsPanel.module.css";
import { deckAndSlideIdProps } from "@/features/deck/deck.types";
import { ResultsDisplayMode, SlideType } from "@/features/deck/store/deckEnums.gen";
import { FollowUpOptionsSection } from "../EditSlideSections/FollowUpOptionsSection";
import { McqOptionsSection } from "../EditSlideSections/McqOptionsSection";
import { NumberOptionsSection } from "../EditSlideSections/NumberOptionsSection";
import { QAndAOptionsSection } from "../EditSlideSections/QAndAOptionsSection";
import { RankingOptionsSection } from "../EditSlideSections/RankingOptionsSection";
import { SlideOptionsSection } from "../EditSlideSections/SlideOptionsSection";
import { TextOptionsSection } from "../EditSlideSections/TextOptionsSection";
import { useSlide } from "@/features/deck/hooks/useSlide";
import { Dropdown } from "@/shared/components/Forms/Input/Dropdown/Dropdown";
import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { Toggle } from "@/shared/components/Forms/Input/Toggle/Toggle";

import {
  ANSWER_SETTINGS_DEFAULTS as D,
} from "../SettingsForms/settingsDefaults";


const PerKindSection = ({ contentType }: { contentType: SlideType }) => {
  switch (contentType) {
    case "MCQ":
      return <McqOptionsSection />;
    case "TEXT":
      return <TextOptionsSection />;
    case "NUMBER":
      return <NumberOptionsSection />;
    case "RANKING":
      return <RankingOptionsSection />;
    case "Q_AND_A":
      return <QAndAOptionsSection />;
    case "FOLLOW_UP":
      return <FollowUpOptionsSection />;
    case "TITLE":
    case "MEDIA":
      return <SlideOptionsSection />;
    default:
      return null;
  }
};



const AnswerPanel = ({
  deckId,
  slideId,
}: deckAndSlideIdProps) => {
  const { answerSettings, updateAnswerSettings, clearAnswerSettings, flush, cancelPendingWrites } =
    useSlideSettingsEditor(deckId, slideId);
  const { isLoaded, settings: deckSettings } = useDeckSettings(deckId);
  const { getSlide } = useSlide(deckId)
  const [promoteAnswerSettings] = usePromoteAnswerSettingsToDeckMutation();


  const slide = getSlide(slideId)
  const idPrefix = "slide-answer"
  const disabled = false

  const deckDefault = deckSettings?.answerSettings;
  const hasOverride = answerSettings != null;
  const effective = resolveAnswerSettings(deckDefault, answerSettings);

  // Local mirror so typing reflects instantly while the slide write debounces.
  // Re-seed when the active slide changes so edits never bleed across slides.
  const [form, setForm] = useState<AnswerSettings>(effective);
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
    patch: Partial<AnswerSettings>,
    { immediate }: { immediate: boolean },
  ) => {
    // Send the COMPLETE settings object, never a partial patch: the backend's
    // AnswerSettings fields are Java primitives that reject a null, so any field
    // omitted from the PUT fails deserialization. `form` is always fully
    // resolved (defaults <- deck <- slide), so merging the patch onto it keeps
    // every field populated.
    const next = { ...form, ...patch };
    setForm(next);
    updateAnswerSettings(next);
    if (immediate) flush();
  };

  const applyToDeck = () => {
    console.log("applying to deck")
    cancelPendingWrites();
    void promoteAnswerSettings({
      id: deckId,
      setAnswerSettingsRequest: { answerSettings: form },
    });
  };

  const resetToDeckDefault = () => {
    clearAnswerSettings();
    setForm(resolveAnswerSettings(deckDefault, undefined));
  };


  const toggle =
    (key: keyof AnswerSettings) => (e: React.ChangeEvent<HTMLInputElement>) => {
      handleChange({ [key]: e.currentTarget.checked }, { immediate: true });
    };

  const number =
    (key: keyof AnswerSettings) => (next: number) => {
      handleChange({ [key]: next }, { immediate: false });
    };

  const toggleTimeLimit = () => {
    if (form.countdownTime == 0) {
      handleChange({ ['countdownTime']: 30 }, { immediate: true });
    }
    else {
      handleChange({ ['countdownTime']: 0 }, { immediate: true });
    }
  }
  const toggleMultipleAnswers = () => {
    if (form.countdownTime == 0) {
      handleChange({ ['maxSelections']: 2 }, { immediate: true });
    }
    else {
      handleChange({ ['maxSelections']: 1 }, { immediate: true });
    }
  }

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
        <>
          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-enable-time-limit`}
            label='Enable time limit'
            disabled={disabled}
            checked={(form.countdownTime ?? 0) > 0}
            onChange={toggleTimeLimit}
          />
          {(form.countdownTime ?? 0) > 0 &&
            <NumberInput
              id={`${idPrefix}-countdown-time`}
              label='Countdown (seconds)'
              min={0}
              max={3600}
              disabled={disabled}
              value={form.countdownTime ?? D.countdownTime}
              infoMessage='0 = unlimited (wait for players / host)'
              onChange={number("countdownTime")}
              onBlur={flush}
            />
          }
          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-enable-time-limit`}
            label='Allow multiple answers'
            disabled={disabled}
            checked={(form.maxSelections ?? 1) > 1}
            onChange={toggleMultipleAnswers}
          />
          {(form.maxSelections ?? 1) > 1 &&
            <NumberInput
              id={`${idPrefix}-max-selections`}
              label='Max selections per player'
              min={1}
              max={50}
              disabled={disabled}
              value={form.maxSelections ?? D.maxSelections}
              onChange={number("maxSelections")}
              onBlur={flush}
            />
          }
          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-shuffle-options`}
            label='Shuffle answer options'
            disabled={disabled}
            checked={form.shuffleOptions ?? D.shuffleOptions}
            onChange={toggle("shuffleOptions")}
          />

          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-anonymize-answers`}
            label='Anonymize answers'
            disabled={disabled}
            checked={form.anonymizeAnswers ?? D.anonymizeAnswers}
            onChange={toggle("anonymizeAnswers")}
          />
          <Dropdown
            id={`${idPrefix}-display-results-mode`}
            label='Reveal results'
            options={RESULTS_DISPLAY_MODE_OPTIONS}
            value={[form.displayResultsMode ?? D.displayResultsMode]}
            onChange={(vals) => {
              if (vals[0]) {
                handleChange(
                  { displayResultsMode: vals[0] as ResultsDisplayMode },
                  { immediate: true },
                );
              }
            }}
          />
        </>
        <Tooltip
          className={styles.applyTooltip}
          label='Sets these as the deck default and removes all per-slide answer-settings overrides, so every slide inherits this value.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to deck
          </Btn>
        </Tooltip>
      </section>

      <section className={slidePanel.section} >
        {slide &&
          <PerKindSection contentType={slide.content.contentType} />
        }
      </section>

      <div className={styles.footer}>
      </div>
    </div>
  );
};

export { AnswerPanel };
