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
import { AnswerSettingsForm } from "../SettingsForms/AnswerSettingsForm";
import { resolveAnswerSettings } from "../SettingsForms/settingsDefaults";
import slidePanel from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import styles from "../SettingsForms/SettingsPanel.module.css";
import { deckAndSlideIdProps } from "@/features/deck/deck.types";


const AnswerPanel = ({ deckId, slideId }: deckAndSlideIdProps) => {

  if (!slideId) {
    return (
      <div className={slidePanel.empty}>
        <p>Select a slide on the left to edit its answer settings.</p>
      </div>
    );
  }
  return <AnswerPanelBody deckId={deckId} slideId={slideId} />;
};

const AnswerPanelBody = ({
  deckId,
  slideId,
}: deckAndSlideIdProps) => {
  const { answerSettings, updateAnswerSettings, clearAnswerSettings, flush, cancelPendingWrites } =
    useSlideSettingsEditor(deckId, slideId);
  const { isLoaded, settings: deckSettings } = useDeckSettings();
  const [promoteAnswerSettings] = usePromoteAnswerSettingsToDeckMutation();

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
        <AnswerSettingsForm
          value={form}
          idPrefix='slide-answer'
          onChange={handleChange}
          onBlur={flush}
        />
      </section>

      <div className={styles.footer}>
        <Tooltip
          className={styles.applyTooltip}
          label='Sets these as the deck default and removes all per-slide answer-settings overrides, so every slide inherits this value.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to deck
          </Btn>
        </Tooltip>
      </div>
    </div>
  );
};

export { AnswerPanel };
