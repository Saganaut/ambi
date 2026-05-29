// Per-element tag picker. Renders inside `DeckCategorizePanel` so all tag
// editing (deck-level + slide-level) is consolidated in one drawer; the
// component returns null when no slide is selected. Analytics in chunk 16
// will group on these tags, and the question-bank work later filters on
// them. Wires the existing TagPicker into the same updateElement commit
// path used by the rest of EditSlideSections.
import { getRouteApi } from "@tanstack/react-router";
import { TagPicker } from "@/components/Common/TagPicker/TagPicker";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  useGetDeckQuery,
  useUpdateElementMutation,
  type DeckResponse,
} from "@/store/AmbiApi";
import styles from "../EditSlidePanel.module.css";

type DeckElement = NonNullable<DeckResponse["elements"]>[number];

const routeApi = getRouteApi("/decks/$deckId/edit");

const ElementTagsSection = () => {
  const { deckId } = routeApi.useParams();
  const { questionId } = routeApi.useSearch();
  const currentUser = useCurrentUser();
  const currentUserId =
    currentUser.state === "registered" || currentUser.state === "guest"
      ? currentUser.user.id
      : undefined;

  const { element } = useGetDeckQuery(
    { id: deckId },
    {
      selectFromResult: ({ data }) => ({
        element: data?.elements?.find((e) => e.id === questionId),
      }),
    },
  );

  const [updateElement] = useUpdateElementMutation();

  if (!element?.id) return null;
  if (currentUser.state !== "registered" && currentUser.state !== "guest") {
    return null;
  }

  const commit = (nextTagIds: string[]) => {
    const stamped: DeckElement = {
      ...element,
      chrome: {
        ...element.chrome,
        tagIds: nextTagIds,
        lastEditedByUserId: currentUserId,
        version: (element.chrome?.version ?? 0) + 1,
      },
    };
    void updateElement({
      id: deckId,
      elementId: element.id ?? "",
      body: stamped,
    })
      .unwrap()
      .catch((err: unknown) => {
        console.error("Failed to update element tags", err);
      });
  };

  return (
    <section className={styles.section}>
      <h4 className={styles.heading}>Slide tags</h4>
      <TagPicker
        creatable
        value={element.chrome?.tagIds ?? []}
        onChange={(next) => {
          commit(next);
        }}
        placeholder='Tag this slide…'
      />
    </section>
  );
};

export { ElementTagsSection };
