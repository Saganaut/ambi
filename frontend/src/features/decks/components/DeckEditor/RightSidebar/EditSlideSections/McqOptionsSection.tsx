// Per-kind inspector section for MCQ slides. Uses useSlideEditor<"MCQ">
// to read and write McqContent fields. The new model uses `shuffle` (was
// `shuffleOptions`) and `maxSelections` only — `allowMultipleSelect` is derived:
// maxSelections === 1 means single-select, any other value means multi-select.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
import { NumberInput } from "@components/Forms/Input/NumberInput/NumberInput";
import { useSlideEditor } from "@/features/decks/hooks/useSlideEditor";
import styles from "../EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useMcqOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  return useSlideEditor(deckId, slideId ?? "", "MCQ");
};

const McqOptionsSection = () => {
  const { slide, updateSlideContent, flush } = useMcqOptionsSection();

  const content = slide?.content;
  const [shuffle, setShuffle] = useState(content?.shuffle ?? true);
  const allowMulti = (content?.maxSelections ?? 1) !== 1;
  const [maxSelections, setMaxSelections] = useState(
    allowMulti ? (content?.maxSelections ?? 0) : 0,
  );
  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setShuffle(slide.content.shuffle ?? true);
    setMaxSelections(
      (slide.content.maxSelections ?? 1) !== 1
        ? (slide.content.maxSelections ?? 0)
        : 0,
    );
  }

  if (!slide) return null;

  const slideId = slide.id;
  const isMulti = (content?.maxSelections ?? 1) !== 1;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Multiple choice</h4>
      <Toggle
        id={`mcq-shuffle-${slideId}`}
        label='Shuffle option order per player'
        checked={shuffle}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setShuffle(next);
          updateSlideContent({ shuffle: next });
          flush();
        }}
      />
      <Toggle
        id={`mcq-multi-${slideId}`}
        label='Allow multiple correct selections'
        checked={isMulti}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          const nextMax = next ? 0 : 1;
          setMaxSelections(next ? 0 : 0);
          updateSlideContent({ maxSelections: nextMax });
          flush();
        }}
      />
      {isMulti && (
        <NumberInput
          id={`mcq-max-${slideId}`}
          label='Max selections (0 = unlimited)'
          min={0}
          max={6}
          value={maxSelections}
          onChange={(next) => {
            setMaxSelections(next);
            updateSlideContent({ maxSelections: next === 0 ? 0 : next });
          }}
          onBlur={flush}
        />
      )}
    </section>
  );
};

export { McqOptionsSection };
