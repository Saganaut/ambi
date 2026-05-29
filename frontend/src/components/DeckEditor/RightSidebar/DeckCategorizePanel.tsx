// Deck-level metadata panel for the right-sidebar inspector. Owns the
// subject-tag picker (single-select, creatable) and the multi-select tag
// picker that drives Explore discoverability — both let authors type a
// custom tag/subject and mint it on the fly via POST /api/tags. Edits
// commit through `updateDeck`; the apiEnhancements layer keeps the cached
// deck in sync, so the rest of the editor sees the change immediately.
import { getRouteApi } from "@tanstack/react-router";
import { useGetDeckQuery, useUpdateDeckMutation } from "@/store/AmbiApi";
import { TagPicker } from "@/components/Common/TagPicker/TagPicker";
import { ElementTagsSection } from "./EditSlideSections/ElementTagsSection";
import styles from "./EditSlidePanel.module.css";

const routeApi = getRouteApi("/decks/$deckId/edit");

const DeckCategorizePanel = () => {
  const { deckId } = routeApi.useParams();
  const { data: deck } = useGetDeckQuery({ id: deckId });
  const [updateDeck] = useUpdateDeckMutation();

  if (!deck) {
    return (
      <div className={styles.empty}>
        <p>Loading deck…</p>
      </div>
    );
  }

  const tagIds = deck.tagIds ?? [];
  const subjectTagId = deck.subjectTagId;

  const commit = (patch: { tagIds?: string[]; subjectTagId?: string }) => {
    void updateDeck({
      id: deckId,
      updateDeckRequest: patch,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update deck categorization", err);
      });
  };

  return (
    <div className={styles.panel}>
      <section className={styles.section}>
        <h4 className={styles.heading}>Subject</h4>
        <TagPicker
          singleSelect
          creatable
          value={
            subjectTagId != null && subjectTagId !== "" ? [subjectTagId] : []
          }
          onChange={(values) => {
            commit({ subjectTagId: values[0] ?? "" });
          }}
          placeholder='Pick or type a subject…'
        />
      </section>

      <section className={styles.section}>
        <h4 className={styles.heading}>Deck tags</h4>
        <TagPicker
          creatable
          value={tagIds}
          onChange={(next) => {
            commit({ tagIds: next });
          }}
          placeholder='Search, add, or create tags…'
        />
      </section>

      <ElementTagsSection />
    </div>
  );
};

export { DeckCategorizePanel };
