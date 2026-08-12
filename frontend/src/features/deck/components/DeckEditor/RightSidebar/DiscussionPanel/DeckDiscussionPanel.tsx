// Discussion panel for the deck-editor right sidebar. Scoped to the slide
// currently selected in the editor (via the `slideId` route search): a composer
// to start a new thread, then the slide's threads. Each thread is a collapsible
// conversation (see CommentThread). With no slide selected there is nothing to
// discuss yet.
import { deckAndSlideIdProps } from "@/features/deck/Deck.types";
import { deckValidation } from "@/features/deck/store/deckValidationConstants";
import { useRegisteredUser } from "@auth/hooks/useCurrentUser";
import {
  useAddThreadCommentMutation,
  useCreateCommentThreadMutation,
  useDeleteThreadCommentMutation,
  useListSlideCommentThreadsQuery,
  useSetThreadStatusMutation,
  useUpdateThreadCommentMutation,
  type CommentThreadResponse,
} from "@deck/store/commentApi.gen";
import { Btn, Pagination } from "@saganaut/ambi-ui";
import { useState } from "react";
import { CommentThread } from "./CommentThread";
import styles from "./DeckDiscussionPanel.module.css";

type ThreadStatus = CommentThreadResponse["status"];

const PAGE_SIZE = 10;

const useDeckDiscussionPanel = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const { me } = useRegisteredUser();
  const [page, setPage] = useState(0);

  const { data, isLoading } = useListSlideCommentThreadsQuery(
    { deckId, slideId: slideId ?? "", pageable: { page, size: PAGE_SIZE } },
    { skip: slideId == null },
  );
  const [createThread, { isLoading: posting }] = useCreateCommentThreadMutation();
  const [addComment] = useAddThreadCommentMutation();
  const [updateComment] = useUpdateThreadCommentMutation();
  const [deleteComment] = useDeleteThreadCommentMutation();
  const [setStatus] = useSetThreadStatusMutation();

  const startThread = async (body: string) => {
    if (slideId == null) return;
    await createThread({ deckId, slideId, commentBodyRequest: { body } }).unwrap();
    setPage(0); // a new thread lands at the top of page 0
  };
  const reply = async (threadId: string, body: string) => {
    if (slideId == null) return;
    await addComment({
      deckId,
      slideId,
      threadId,
      commentBodyRequest: { body },
    }).unwrap();
  };
  const edit = async (threadId: string, commentId: string, body: string) => {
    if (slideId == null) return;
    await updateComment({
      deckId,
      slideId,
      threadId,
      commentId,
      commentBodyRequest: { body },
    }).unwrap();
  };
  const remove = async (threadId: string, commentId: string) => {
    if (slideId == null) return;
    await deleteComment({ deckId, slideId, threadId, commentId }).unwrap();
  };
  const setThreadStatus = async (threadId: string, status: ThreadStatus) => {
    if (slideId == null) return;
    await setStatus({
      deckId,
      slideId,
      threadId,
      setThreadStatusRequest: { status },
    }).unwrap();
  };

  return {
    hasSlide: slideId != null,
    currentUserId: me.publicId,
    threads: data?.content ?? [],
    pageCount: data?.page?.totalPages ?? 0,
    page,
    setPage,
    isLoading,
    posting,
    startThread,
    reply,
    edit,
    remove,
    setThreadStatus,
  };
};

const DeckDiscussionPanel = ({ deckId, slideId }: deckAndSlideIdProps) => {
  const {
    hasSlide,
    currentUserId,
    threads,
    pageCount,
    page,
    setPage,
    isLoading,
    posting,
    startThread,
    reply,
    edit,
    remove,
    setThreadStatus,
  } = useDeckDiscussionPanel({ deckId, slideId });

  if (!hasSlide) {
    return (
      <div className={styles.panel}>
        <p className={styles.empty}>Select a slide to start a discussion.</p>
      </div>
    );
  }

  return (
    <div className={styles.panel}>
      <Composer disabled={posting} onSubmit={startThread} />

      {isLoading ? (
        <p className={styles.empty}>Loading discussion…</p>
      ) : threads.length === 0 ? (
        <p className={styles.empty}>No threads on this slide yet — start one above.</p>
      ) : (
        <>
          <ul className={styles.threadList}>
            {threads.map((thread) => (
              <CommentThread
                key={thread.id}
                thread={thread}
                currentUserId={currentUserId}
                canInteract
                onReply={reply}
                onEdit={edit}
                onDelete={remove}
                onSetStatus={setThreadStatus}
              />
            ))}
          </ul>
          {pageCount > 1 && (
            <div className={styles.pager}>
              <Pagination
                page={page}
                pageCount={pageCount}
                onPageChange={setPage}
                ariaLabel="Discussion pages"
              />
            </div>
          )}
        </>
      )}
    </div>
  );
};

interface ComposerProps {
  disabled: boolean;
  onSubmit: (body: string) => Promise<void> | void;
}

const Composer = ({ disabled, onSubmit }: ComposerProps) => {
  const [value, setValue] = useState("");
  const trimmed = value.trim();

  return (
    <div className={styles.composer}>
      <textarea
        className={styles.composerInput}
        aria-label="Start a thread"
        placeholder="Start a thread on this slide…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        rows={3}
        maxLength={deckValidation.CommentBodyRequest.body.maxLength}
      />
      <div className={styles.composerActions}>
        <Btn
          size="sm"
          shape="pill"
          isDisabled={disabled || trimmed === ""}
          onClick={() => {
            if (trimmed === "") return;
            void Promise.resolve(onSubmit(trimmed)).then(() => {
              setValue("");
            });
          }}
        >
          Start thread
        </Btn>
      </div>
    </div>
  );
};

export { DeckDiscussionPanel };
