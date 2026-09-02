import styles from "@deck/components/DeckEditor/RightSidebar/EditSlidePanel/EditSlidePanel.module.css";
import { useSlideEditor } from "@deck/hooks/useSlideEditor";
import { useSlideSettings } from "@deck/hooks/useSlideSettings";
import { Toggle } from "@saganaut/ambi-ui";
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const McqOptionsSection = () => {
  const { deckId } = routeApi.useParams();
  const { slideId } = routeApi.useSearch();
  const { slide } = useSlideEditor(deckId, slideId ?? "", "MCQ");
  const { answerSettings, scheduleAnswerSettings, flush } = useSlideSettings(deckId, slideId ?? "");

  const [shuffle, setShuffle] = useState(answerSettings?.shuffleOptions ?? true);

  const [syncedId, setSyncedId] = useState<string | undefined>(slide?.id);

  if (slide && syncedId !== slide.id) {
    setSyncedId(slide.id);
    setShuffle(answerSettings?.shuffleOptions ?? true);
  }

  if (!slide) return null;

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Multiple choice</h4>
      <div className={styles.rows}>
        <Toggle
          labelPosition="start"
          id={`mcq-shuffle-${slide.id}`}
          label="Shuffle option order"
          checked={shuffle}
          onChange={(e) => {
            const next = e.currentTarget.checked;
            setShuffle(next);
            scheduleAnswerSettings({ shuffleOptions: next });
            flush();
          }}
        />
      </div>
    </section>
  );
};

export { McqOptionsSection };
