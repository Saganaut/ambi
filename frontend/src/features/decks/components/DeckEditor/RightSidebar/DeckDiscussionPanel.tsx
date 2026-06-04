// Discussion panel for the deck-editor right sidebar. Wraps the shared
// CommentThread with the "new comment" composer + the top-level pagination
// affordance. The composer is hidden for visitors; for registered users it
// posts a top-level comment and the apiEnhancements layer reconciles the
// listComments cache on success.
import { getRouteApi } from "@tanstack/react-router";
import { useState } from "react";

import { Btn } from "@ui/Buttons/Btn";
import { CommentThread } from "@/features/decks/components/DeckEditor/RightSidebar/CommentThread/CommentThread";
import { Pagination } from "@ui/Pagination/Pagination";
import styles from "./DeckDiscussionPanel.module.css";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";

const routeApi = getRouteApi("/_authenticated/decks/$deckId/edit");
const PAGE_SIZE = 10;

const DeckDiscussionPanel = () => {
  const { deckId } = routeApi.useParams();
  const currentUser = useCurrentUser();
  const callerId =
    currentUser.state === "registered" ? (currentUser.user.id ?? null) : null;
  const canInteract = currentUser.state === "registered";

  const [page, setPage] = useState(0);
  const {
    data: commentsPage,
    isFetching,
    refetch,
  } = useListCommentsQuery({
    id: deckId,
    page,
    size: PAGE_SIZE,
  });
  const [postComment] = usePostCommentMutation();
  const [editComment] = useEditCommentMutation();
  const [deleteComment] = useDeleteCommentMutation();
  const [toggleUpvote] = useToggleCommentUpvoteMutation();

  const [draft, setDraft] = useState("");
  const items = commentsPage?.items ?? [];
  const hasMore = commentsPage?.hasMore ?? false;

  const submitTopLevel = async () => {
    const body = draft.trim();
    if (body === "") return;
    await postComment({
      id: deckId,
      createCommentRequest: { body },
    }).unwrap();
    setDraft("");
    void refetch();
  };

  const submitReply = async (parentCommentId: string, body: string) => {
    await postComment({
      id: deckId,
      createCommentRequest: { body, parentCommentId },
    }).unwrap();
    void refetch();
  };

  return (
    <div className={styles.panel}>
      {canInteract ? (
        <section className={styles.composer}>
          <textarea
            className={styles.composerInput}
            placeholder='Join the discussion…'
            value={draft}
            onChange={(e) => {
              setDraft(e.target.value);
            }}
            rows={3}
            maxLength={4000}
          />
          <div className={styles.composerActions}>
            <Btn
              size='sm'
              shape='pill'
              onClick={() => {
                void submitTopLevel();
              }}
              disabled={draft.trim() === ""}>
              Post
            </Btn>
          </div>
        </section>
      ) : (
        <p className={styles.signedOut}>Sign in to join the discussion.</p>
      )}

      <section>
        {items.length === 0 && !isFetching ? (
          <p className={styles.empty}>No comments yet. Be the first.</p>
        ) : (
          <CommentThread
            deckId={deckId}
            items={items}
            currentUserId={callerId}
            canInteract={canInteract}
            onToggleUpvote={(commentId) => {
              void toggleUpvote({ deckId, commentId });
            }}
            onReply={submitReply}
            onEdit={async (commentId, body) => {
              await editComment({
                deckId,
                commentId,
                updateCommentRequest: { body },
              }).unwrap();
              void refetch();
            }}
            onDelete={async (commentId) => {
              await deleteComment({ deckId, commentId }).unwrap();
              void refetch();
            }}
          />
        )}

        {(page > 0 || hasMore) && (
          <div className={styles.pager}>
            <Pagination
              page={page}
              hasMore={hasMore}
              disabled={isFetching}
              ariaLabel='Comments pagination'
              onPageChange={setPage}
            />
          </div>
        )}
      </section>
    </div>
  );
};

export { DeckDiscussionPanel };
