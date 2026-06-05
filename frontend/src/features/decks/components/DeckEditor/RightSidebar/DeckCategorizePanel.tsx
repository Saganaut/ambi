// Deck-level metadata panel for the right-sidebar inspector.
// TODO: The tag picker (useTagPickerData / useListTagsQuery / useCreateTagMutation)
// is not yet implemented in the new API. The tags API endpoints are missing from
// AmbiApi.ts. Wire tag pickers once the tag API is available.
// TODO: DeckResponse.subjectTagId is gone from the new model.
// The new model has deck.tags: string[] (tag names, not IDs).
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery } from "@store/AmbiApi";
import styles from "./EditSlidePanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useDeckCategorizePanel = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  return { deck };
};

const DeckCategorizePanel = () => {
  const { deck } = useDeckCategorizePanel();

  if (!deck) {
    return (
      <div className={styles.empty}>
        <p>Loading deck…</p>
      </div>
    );
  }

  const tags = deck.tags ?? [];

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Deck tags</h4>
        {/* TODO: Replace with TagPicker once useListTagsQuery / useCreateTagMutation
            are available in AmbiApi. Currently shows the raw tag list. */}
        {tags.length > 0 ? (
          <ul className={styles.tagList ?? ""}>
            {tags.map((tag) => (
              <li key={tag}>{tag}</li>
            ))}
          </ul>
        ) : (
          <p className={styles.empty}>No tags yet.</p>
        )}
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Slide tags</h4>
        {/* TODO: Wire slide-level tags once the new slide model supports tagIds
            and the tag API endpoints are available. */}
        <p className={styles.empty}>Slide tags coming soon.</p>
      </section>
    </div>
  );
};

export { DeckCategorizePanel };
