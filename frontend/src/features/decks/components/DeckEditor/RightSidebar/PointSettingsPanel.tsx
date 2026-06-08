// Per-slide point settings drawer. Same three-layer model as
// AnswerSettingsPanel (defaults ← deck default ← slide override); see that file
// for the full rationale. This panel only differs in the settings shape it
// wires: point settings instead of answer settings.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Btn } from "@ui/Buttons/Btn";
import { Tooltip } from "@ui/Tooltip/Tooltip";
import type { PointSettings } from "@store/AmbiApi";
import { useSlideSettingsEditor } from "@/features/decks/hooks/useSlideSettingsEditor";
import { useDeckSettings } from "./useDeckSettings";
import { PointSettingsForm } from "./SettingsForms/PointSettingsForm";
import { resolvePointSettings } from "./SettingsForms/settingsDefaults";
import slidePanel from "./EditSlidePanel.module.css";
import styles from "./SettingsForms/SettingsPanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const PointSettingsPanel = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();

  if (!slideId) {
    return (
      <div className={slidePanel.empty}>
        <p>Select a slide on the left to edit its point settings.</p>
      </div>
    );
  }
  return <PointSettingsPanelBody deckId={deckId} slideId={slideId} />;
};

const PointSettingsPanelBody = ({
  deckId,
  slideId,
}: {
  deckId: string;
  slideId: string;
}) => {
  const { pointSettings, updatePointSettings, clearPointSettings, flush } =
    useSlideSettingsEditor(deckId, slideId);
  const {
    isLoaded,
    settings: deckSettings,
    commit: commitDeck,
  } = useDeckSettings();

  const deckDefault = deckSettings?.pointSettings;
  const hasOverride = pointSettings != null;
  const effective = resolvePointSettings(deckDefault, pointSettings);

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
    commitDeck({ pointSettings: form });
    // The values are now the deck default; drop the identical slide override.
    clearPointSettings();
  };

  const resetToDeckDefault = () => {
    clearPointSettings();
    setForm(resolvePointSettings(deckDefault, undefined));
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
        <PointSettingsForm
          value={form}
          idPrefix='slide-point'
          onChange={handleChange}
          onBlur={flush}
        />
      </section>

      <div className={styles.footer}>
        <Tooltip
          className={styles.applyTooltip}
          label='Saves these as the deck default and resets this slide to use it. Other slides keep their own settings.'>
          <Btn variant='secondary' fill='bordered' onClick={applyToDeck}>
            Apply to deck
          </Btn>
        </Tooltip>
      </div>
    </div>
  );
};

export { PointSettingsPanel };
