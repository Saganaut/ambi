// Per-kind inspector section for MCQ slides. Content (options + correct ids) is
// edited elsewhere; the knobs here — shuffle and max selections — now live on
// the slide's answer settings, so this section writes them through
// useSlideSettingsEditor. `allowMultipleSelect` is derived: maxSelections === 1
// means single-select, any other value means multi-select.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useSlideSettingsEditor } from "@deck/hooks/useSlideSettingsEditor";
import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const McqOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slide } = useSlideEditor(deckId, slideId ?? "", "MCQ");
  const { answerSettings, updateAnswerSettings, flush } =
    useSlideSettingsEditor(deckId, slideId ?? "");

  const [shuffle, setShuffle] = useState(
    answerSettings?.shuffleOptions ?? true,
  );
  const allowMulti = (answerSettings?.maxSelections ?? 1) !== 1;
  const [maxSelections, setMaxSelections] = useState(
    allowMulti ? (answerSettings?.maxSelections ?? 2) : 1,
  );
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setShuffle(answerSettings?.shuffleOptions ?? true);
    setMaxSelections(answerSettings?.maxSelections ?? 1);
  }

  if (!slide) return null;

  const isMulti = (answerSettings?.maxSelections ?? 1) !== 1;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Multiple choice</h4>
      <Toggle
        id={`mcq-shuffle-${slide.id}`}
        label='Shuffle option order per player'
        checked={shuffle}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setShuffle(next);
          updateAnswerSettings({ shuffleOptions: next });
          flush();
        }}
      />
      <Toggle
        id={`mcq-multi-${slide.id}`}
        label='Allow multiple correct selections'
        checked={isMulti}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          const nextMax = next ? 1 : 2;
          setMaxSelections(1);
          updateAnswerSettings({ maxSelections: nextMax });
          flush();
        }}
      />
      {isMulti && (
        <NumberInput
          id={`mcq-max-${slide.id}`}
          label='Max selections (0 = unlimited)'
          min={0}
          max={6}
          value={maxSelections}
          onChange={(next) => {
            setMaxSelections(next);
            updateAnswerSettings({ maxSelections: next === 0 ? 0 : next });
          }}
          onBlur={flush}
        />
      )}
    </section>
  );
};

export { McqOptionsSection };
