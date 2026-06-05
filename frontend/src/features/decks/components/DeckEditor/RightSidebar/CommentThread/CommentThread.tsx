// Threaded comment list. Renders a flat row per top-level comment with a
// "Show N replies" affordance underneath; replies expand inline on demand.
// TODO: Wire useListRepliesQuery and DeckCommentResponse once comment APIs
// are available in AmbiApi. Placeholder types are used in the interim.
import { useState } from "react";

// TODO: Remove once DeckCommentResponse is available from @store/AmbiApi.
interface DeckCommentAuthor {
  userId?: string;
  name?: string;
  pictureUrl?: string;
}
interface DeckCommentResponse {
  id?: string;
  body?: string;
  author?: DeckCommentAuthor;
  parentCommentId?: string;
  upvotes?: number;
  upvotedByMe?: boolean;
  replyCount?: number;
  edited?: boolean;
  deleted?: boolean;
}
import {
  ArrowUturnLeftIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { HandThumbUpIcon as ThumbOutline } from "@heroicons/react/24/outline";
import { HandThumbUpIcon as ThumbSolid } from "@heroicons/react/24/solid";
import { Btn } from "@ui/Buttons/Btn";
import { resolveAvatarSrc } from "@utils/avatarUrl";
import styles from "./CommentThread.module.css";

interface CommentThreadProps {
  deckId: string;
  items: DeckCommentResponse[];
  currentUserId: string | null;
  canInteract: boolean;
  onToggleUpvote: (commentId: string) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void> | void;
  onEdit: (commentId: string, body: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}

const CommentThread = ({
  deckId,
  items,
  currentUserId,
  canInteract,
  onToggleUpvote,
  onReply,
  onEdit,
  onDelete,
}: CommentThreadProps) => {
  return (
    <ul className={styles.thread}>
      {items.map((comment) => (
        <CommentNode
          key={comment.id}
          deckId={deckId}
          comment={comment}
          currentUserId={currentUserId}
          canInteract={canInteract}
          onToggleUpvote={onToggleUpvote}
          onReply={onReply}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};

interface CommentNodeProps {
  deckId: string;
  comment: DeckCommentResponse;
  currentUserId: string | null;
  canInteract: boolean;
  onToggleUpvote: (commentId: string) => void;
  onReply: (parentCommentId: string, body: string) => Promise<void> | void;
  onEdit: (commentId: string, body: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}

const CommentNode = ({
  deckId,
  comment,
  currentUserId,
  canInteract,
  onToggleUpvote,
  onReply,
  onEdit,
  onDelete,
}: CommentNodeProps) => {
  const [showReplies, setShowReplies] = useState(false);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const [editing, setEditing] = useState(false);
  const replyCount = comment.replyCount ?? 0;
  const isAuthor = currentUserId === comment.author?.userId;

  return (
    <li className={styles.item}>
      <CommentBody
        comment={comment}
        canInteract={canInteract}
        isAuthor={isAuthor}
        editing={editing}
        onToggleUpvote={() => {
          onToggleUpvote(comment.id ?? "");
        }}
        onReplyClick={() => {
          setShowReplyBox((prev) => !prev);
        }}
        onEditStart={() => {
          setEditing(true);
        }}
        onEditCancel={() => {
          setEditing(false);
        }}
        onEditSubmit={(body) => {
          void Promise.resolve(onEdit(comment.id ?? "", body)).then(() => {
            setEditing(false);
          });
        }}
        onDelete={() => {
          void onDelete(comment.id ?? "");
        }}
      />

      {showReplyBox && canInteract && (
        <CommentEditor
          placeholder='Write a reply…'
          onCancel={() => {
            setShowReplyBox(false);
          }}
          onSubmit={(body) => {
            void Promise.resolve(onReply(comment.id ?? "", body)).then(() => {
              setShowReplyBox(false);
              setShowReplies(true);
            });
          }}
        />
      )}

      {replyCount > 0 && (
        <button
          type='button'
          className={styles.toggleReplies}
          onClick={() => {
            setShowReplies((prev) => !prev);
          }}>
          {showReplies
            ? "Hide replies"
            : `Show ${String(replyCount)} ${
                replyCount === 1 ? "reply" : "replies"
              }`}
        </button>
      )}

      {showReplies && (
        <RepliesList
          deckId={deckId}
          parentCommentId={comment.id ?? ""}
          currentUserId={currentUserId}
          canInteract={canInteract}
          onToggleUpvote={onToggleUpvote}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </li>
  );
};

interface CommentBodyProps {
  comment: DeckCommentResponse;
  canInteract: boolean;
  isAuthor: boolean;
  editing: boolean;
  onToggleUpvote: () => void;
  onReplyClick: () => void;
  onEditStart: () => void;
  onEditCancel: () => void;
  onEditSubmit: (body: string) => void;
  onDelete: () => void;
}

const CommentBody = ({
  comment,
  canInteract,
  isAuthor,
  editing,
  onToggleUpvote,
  onReplyClick,
  onEditStart,
  onEditCancel,
  onEditSubmit,
  onDelete,
}: CommentBodyProps) => {
  const ThumbIcon = comment.upvotedByMe ? ThumbSolid : ThumbOutline;
  const upvotes = comment.upvotes ?? 0;
  const isReply = comment.parentCommentId != null;
  const isDeleted = comment.deleted ?? false;

  return (
    <article
      className={[styles.comment, isReply && styles.reply]
        .filter(Boolean)
        .join(" ")}>
      <header className={styles.header}>
        {comment.author?.pictureUrl != null &&
          comment.author.pictureUrl !== "" && (
            <img
              src={resolveAvatarSrc(comment.author.pictureUrl)}
              alt=''
              className={styles.avatar}
            />
          )}
        <span className={styles.author}>
          {comment.author?.name ?? "Anonymous"}
        </span>
        {comment.edited === true && !isDeleted && (
          <span className={styles.editedTag}>edited</span>
        )}
      </header>

      {editing && !isDeleted ? (
        <CommentEditor
          initialValue={comment.body ?? ""}
          submitLabel='Save'
          onCancel={onEditCancel}
          onSubmit={onEditSubmit}
        />
      ) : (
        <p
          className={[styles.body, isDeleted && styles.bodyDeleted]
            .filter(Boolean)
            .join(" ")}>
          {comment.body}
        </p>
      )}

      {!editing && (
        <footer className={styles.footer}>
          <button
            type='button'
            className={[
              styles.upvote,
              comment.upvotedByMe === true && styles.upvoteActive,
            ]
              .filter(Boolean)
              .join(" ")}
            onClick={onToggleUpvote}
            disabled={!canInteract || isDeleted}
            aria-pressed={comment.upvotedByMe ?? false}
            aria-label={comment.upvotedByMe ? "Remove upvote" : "Upvote"}>
            <ThumbIcon className={styles.upvoteIcon} />
            <span className={styles.upvoteCount}>{upvotes}</span>
          </button>
          {canInteract && !isDeleted && !isReply && (
            <button
              type='button'
              className={styles.actionBtn}
              onClick={onReplyClick}>
              <ArrowUturnLeftIcon className={styles.actionIcon} />
              <span>Reply</span>
            </button>
          )}
          {canInteract && isAuthor && !isDeleted && (
            <>
              <button
                type='button'
                className={styles.actionBtn}
                onClick={onEditStart}>
                <PencilIcon className={styles.actionIcon} />
                <span>Edit</span>
              </button>
              <button
                type='button'
                className={styles.actionBtn}
                onClick={onDelete}>
                <TrashIcon className={styles.actionIcon} />
                <span>Delete</span>
              </button>
            </>
          )}
        </footer>
      )}
    </article>
  );
};

interface RepliesListProps {
  deckId: string;
  parentCommentId: string;
  currentUserId: string | null;
  canInteract: boolean;
  onToggleUpvote: (commentId: string) => void;
  onEdit: (commentId: string, body: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}

const RepliesList = ({
  deckId: _deckId,
  parentCommentId: _parentCommentId,
  currentUserId,
  canInteract,
  onToggleUpvote,
  onEdit,
  onDelete,
}: RepliesListProps) => {
  // TODO: Replace with useListRepliesQuery once comment reply APIs are available.
  const items: DeckCommentResponse[] = [];

  if (items.length === 0) return null;

  return (
    <ul className={styles.repliesList}>
      {items.map((reply) => (
        <ReplyItem
          key={reply.id}
          reply={reply}
          currentUserId={currentUserId}
          canInteract={canInteract}
          onToggleUpvote={onToggleUpvote}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </ul>
  );
};

interface ReplyItemProps {
  reply: DeckCommentResponse;
  currentUserId: string | null;
  canInteract: boolean;
  onToggleUpvote: (commentId: string) => void;
  onEdit: (commentId: string, body: string) => Promise<void> | void;
  onDelete: (commentId: string) => Promise<void> | void;
}

const ReplyItem = ({
  reply,
  currentUserId,
  canInteract,
  onToggleUpvote,
  onEdit,
  onDelete,
}: ReplyItemProps) => {
  const [editing, setEditing] = useState(false);

  return (
    <li className={styles.replyItem}>
      <CommentBody
        comment={reply}
        canInteract={canInteract}
        isAuthor={currentUserId === reply.author?.userId}
        editing={editing}
        onToggleUpvote={() => {
          onToggleUpvote(reply.id ?? "");
        }}
        onReplyClick={() => {
          // No-op: replies of replies are not allowed by the API and the
          // CommentBody hides the reply button when `isReply` is true.
        }}
        onEditStart={() => {
          setEditing(true);
        }}
        onEditCancel={() => {
          setEditing(false);
        }}
        onEditSubmit={(body) => {
          void Promise.resolve(onEdit(reply.id ?? "", body)).then(() => {
            setEditing(false);
          });
        }}
        onDelete={() => {
          void onDelete(reply.id ?? "");
        }}
      />
    </li>
  );
};

interface CommentEditorProps {
  initialValue?: string;
  placeholder?: string;
  submitLabel?: string;
  onSubmit: (body: string) => void;
  onCancel: () => void;
}

const CommentEditor = ({
  initialValue = "",
  placeholder,
  submitLabel = "Post",
  onSubmit,
  onCancel,
}: CommentEditorProps) => {
  const [value, setValue] = useState(initialValue);
  const trimmed = value.trim();

  return (
    <div className={styles.editor}>
      <textarea
        className={styles.editorInput}
        aria-label={placeholder ?? "Comment"}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
        }}
        rows={3}
        maxLength={4000}
        autoFocus
      />
      <div className={styles.editorActions}>
        <Btn size='sm' shape='pill' fill='ghost' onClick={onCancel}>
          Cancel
        </Btn>
        <Btn
          size='sm'
          shape='pill'
          onClick={() => {
            if (trimmed === "") return;
            onSubmit(trimmed);
            setValue("");
          }}
          disabled={trimmed === ""}>
          {submitLabel}
        </Btn>
      </div>
    </div>
  );
};

export { CommentThread };
