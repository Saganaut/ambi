// Per-slide answer settings drawer. Three-layer model:
//   - The form shows the effective value: hardcoded defaults ← deck default ←
//     this slide's override (resolveAnswerSettings).
//   - Editing a field writes a *slide override* (useSlideSettings) so the
//     change applies to this slide only.
//   - "Apply to deck" promotes the current values to the deck-wide default
//     (read via useDeckQuery) and drops the now-redundant slide override, so the slide
//     simply inherits the new default.
//   - "Reset to deck default" clears the override when one exists.
//
// The form itself is the reusable AnswerSettingsForm; this panel is only the
// slide/deck wiring around it.
import { useState } from "react";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { AnswerSettings } from "@deck/store/deckApi.gen";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import { usePromoteAnswerSettingsToDeckMutation } from "@deck/store/deckApi.gen";
import { useDeckQuery } from "../../../../hooks/useDeckQuery";
import { resolveAnswerSettings, RESULTS_DISPLAY_MODE_OPTIONS } from "../shared/settingsDefaults";
import slidePanel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "../shared/SettingsPanel.module.css";
import { deckAndSlideIdProps } from "@/features/deck/Deck.types";
import { ResultsDisplayMode, SlideType } from "@/features/deck/store/deckEnums.gen";
import { FollowUpOptionsSection } from "../EditSlideSections/FollowUpOptionsSection";
import { McqOptionsSection } from "../EditSlideSections/McqOptionsSection";
import { McqResultsSection } from "../EditSlideSections/McqResultsSection/McqResultsSection";
import { NumberOptionsSection } from "../EditSlideSections/NumberOptionsSection";
import { QAndAOptionsSection } from "../EditSlideSections/QAndAOptionsSection";
import { RankingOptionsSection } from "../EditSlideSections/RankingOptionsSection";
import { SlideOptionsSection } from "../EditSlideSections/SlideOptionsSection";
import { TextOptionsSection } from "../EditSlideSections/TextOptionsSection";
import { useSlide } from "@/features/deck/hooks/useSlide";
import { isScorableSlideType } from "@deck/utils/slideContent";
import { Dropdown } from "@/shared/components/Forms/Input/Dropdown/Dropdown";
import { NumberInput } from "@/shared/components/Forms/Input/NumberInput/NumberInput";
import { Toggle } from "@/shared/components/Forms/Input/Toggle/Toggle";

import {
  ANSWER_SETTINGS_DEFAULTS as D,
} from "../shared/settingsDefaults";


const PerKindSection = ({ contentType }: { contentType: SlideType }) => {
  switch (contentType) {
    case "MCQ":
      return (
        <>
          <McqOptionsSection />
          <McqResultsSection />
        </>
      );
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
    case "CONTENT":
    case "MEDIA":
    case "INSTRUCTION":
      return <SlideOptionsSection />;
    default:
      return null;
  }
};



const AnswerPanel = ({
  deckId,
  slideId,
}: deckAndSlideIdProps) => {
  const { answerSettings, scheduleAnswerSettings, clearAnswerSettings, flush, cancel } =
    useSlideSettings(deckId, slideId);
  const { deck } = useDeckQuery(deckId);
  const isLoaded = deck != null;
  const deckSettings = deck?.settings;
  const { getSlide } = useSlide(deckId)
  const [promoteAnswerSettings] = usePromoteAnswerSettingsToDeckMutation();


  const slide = getSlide(slideId)
  const idPrefix = "slide-answer"
  const disabled = false
  // Answer/scoring knobs (time limit, multiple answers, reveal results, …) are
  // meaningless for non-scorable "content" kinds (TITLE / MEDIA / Q_AND_A), so
  // the whole settings form is hidden for them; only the per-kind section shows.
  const isScorable = slide != null && isScorableSlideType(slide.content.contentType)

  const deckDefault = deckSettings?.answerSettings;
  const hasOverride = answerSettings != null;
  const effective = resolveAnswerSettings(deckDefault, answerSettings);

  // Local mirror so typing reflects instantly while the slide write debounces.
  // Re-seed when the active slide changes so edits never bleed across slides.
  const [form, setForm] = useState<AnswerSettings>(effective);
  const [syncedKey, setSyncedKey] = useState(isLoaded ? slideId : undefined);
  // UI-only mirror of "is the time-limit field showing". Derived from the
  // persisted countdownTime, but it stands in for it so the field's collapse
  // can be *deferred to blur* (toggleTimeLimitField) — typing the value down to
  // 0 mid-edit (e.g. clearing the input to retype) no longer unmounts the field
  // out from under the cursor. Avoids adding a separate persisted flag.
  const [showTimeLimit, setShowTimeLimit] = useState((effective.countdownTime ?? 0) > 0);

  if (isLoaded && syncedKey !== slideId) {
    setSyncedKey(slideId);
    setForm(effective);
    setShowTimeLimit((effective.countdownTime ?? 0) > 0);
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
    scheduleAnswerSettings(next);
    if (immediate) flush();
  };

  const applyToDeck = () => {
    cancel();
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
    if (showTimeLimit) {
      setShowTimeLimit(false);
      handleChange({ countdownTime: 0 }, { immediate: true });
    } else {
      setShowTimeLimit(true);
      handleChange({ countdownTime: 30 }, { immediate: true });
    }
  };

  // Deferred collapse: only when the user commits the edit (blur) does a
  // countdown of 0 actually hide the field, so it stays put while being typed.
  const blurTimeLimit = () => {
    flush();
    if ((form.countdownTime ?? 0) <= 0) setShowTimeLimit(false);
  };
  const toggleMultipleAnswers = () => {
    if (form.maxSelections == 1) {
      handleChange({ ['maxSelections']: 2 }, { immediate: true });
    }
    else {
      handleChange({ ['maxSelections']: 1 }, { immediate: true });
    }
  }

  return (
    <div className={slidePanel.panel}>
      {isScorable && (hasOverride ? (
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
      ))}

      {isScorable && (
      <section className={slidePanel.section}>
        <>
          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-enable-time-limit`}
            label='Enable time limit'
            disabled={disabled}
            checked={showTimeLimit}
            onChange={toggleTimeLimit}
          />
          {showTimeLimit &&
            <NumberInput
              id={`${idPrefix}-countdown-time`}
              label='Countdown (seconds)'
              min={0}
              max={3600}
              disabled={disabled}
              value={form.countdownTime ?? D.countdownTime}
              infoMessage='0 = No time limit'
              onChange={number("countdownTime")}
              onBlur={blurTimeLimit}
            />
          }
          <Toggle
            labelPosition="labelBefore"
            id={`${idPrefix}-enable-max-selections`}
            label='Allow multiple answers'
            disabled={disabled}
            checked={!(form.maxSelections == 1)}
            onChange={toggleMultipleAnswers}
          />
          {(form.maxSelections ?? 1) > 1 &&
            <NumberInput
              id={`${idPrefix}-max-selections`}
              label='Answers per participant'
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
          {slide?.content.contentType === 'MCQ' && (
            <Toggle
              labelPosition="labelBefore"
              id={`${idPrefix}-display-as-percentage`}
              label='Show results as percentages'
              disabled={disabled}
              checked={form.displayResultsAsPercentage ?? D.displayResultsAsPercentage}
              onChange={toggle("displayResultsAsPercentage")}
            />
          )}
        </>
        <Tooltip
          className={styles.applyTooltip}
          label='Sets these as the deck default and removes all per-slide answer-settings overrides, so every slide inherits this value.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to all slides
          </Btn>
        </Tooltip>
      </section>
      )}

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
