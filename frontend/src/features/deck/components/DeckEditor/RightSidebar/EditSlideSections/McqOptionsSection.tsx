// Per-kind inspector section for MCQ slides. Content (options + correct ids) is
// edited elsewhere; the knobs here — shuffle and max selections — now live on
// the slide's answer settings, so this section writes them through
// useSlideSettingsEditor. `allowMultipleSelect` is derived: maxSelections === 1
// means single-select, any other value means multi-select.
import { useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { Toggle } from "@components/Forms/Input/Toggle/Toggle";
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

  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setShuffle(answerSettings?.shuffleOptions ?? true);
  }

  if (!slide) return null;


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
    </section>
  );
};

export { McqOptionsSection };
