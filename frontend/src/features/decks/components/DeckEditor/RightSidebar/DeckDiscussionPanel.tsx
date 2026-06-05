// Discussion panel for the deck-editor right sidebar.
// TODO: Wire comment APIs once they are available in AmbiApi:
//   - useListCommentsQuery({ id: deckId, page, size })
//   - usePostCommentMutation()
//   - useEditCommentMutation()
//   - useDeleteCommentMutation()
//   - useToggleCommentUpvoteMutation()
// The CommentThread component is ready but has no data source.
import { getRouteApi } from "@tanstack/react-router";
import styles from "./DeckDiscussionPanel.module.css";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");

const useDeckDiscussionPanel = () => {
  const { deckId } = routeApi.useParams();
  // TODO: const [page, setPage] = useState(0);
  // TODO: const { data: commentsPage } = useListCommentsQuery({ id: deckId, page, size: 10 });
  // TODO: const [postComment] = usePostCommentMutation();
  return { deckId };
};

const DeckDiscussionPanel = () => {
  useDeckDiscussionPanel();

  return (
    <div className={styles.panel}>
      <p className={styles.empty}>
        Discussion is coming soon. Comment APIs are not yet available.
      </p>
    </div>
  );
};

export { DeckDiscussionPanel };
