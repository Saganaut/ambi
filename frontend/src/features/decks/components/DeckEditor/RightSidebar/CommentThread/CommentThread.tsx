// A single slide-discussion thread: an opening comment plus a flat list of
// replies, all tied to one slide. The whole thread is collapsible (chevron in
// the header → a one-line summary). An open thread can be replied to and
// resolved; a resolved thread shows a badge and can be reopened. Soft-deleted
// comments keep their row with a redacted body so the conversation stays intact.
import { useState } from "react";
import {
  ArrowUturnLeftIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  PencilIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import type { CommentResponse, CommentThreadResponse } from "@store/AmbiApi";
import { Btn } from "@ui/Buttons/Btn";
import { resolveAvatarSrc } from "@utils/avatarUrl";
import styles from "./CommentThread.module.css";

type ThreadStatus = CommentThreadResponse["status"];

interface CommentThreadProps {
  thread: CommentThreadResponse;
  currentUserId: string | null;
  canInteract: boolean;
  onReply: (threadId: string, body: string) => Promise<void> | void;
  onEdit: (threadId: string, commentId: string, body: string) => Promise<void> | void;
  onDelete: (threadId: string, commentId: string) => Promise<void> | void;
  onSetStatus: (threadId: string, status: ThreadStatus) => Promise<void> | void;
}

const CommentThread = ({
  thread,
  currentUserId,
  canInteract,
  onReply,
  onEdit,
  onDelete,
  onSetStatus,
}: CommentThreadProps) => {
  const resolved = thread.status === "RESOLVED";
  // Resolved threads start collapsed (out of the way); open ones start expanded.
  const [collapsed, setCollapsed] = useState(resolved);
  const [showReplyBox, setShowReplyBox] = useState(false);
  const opener = thread.comments[0];
  const count = thread.comments.length;

  return (
    <li
      className={[styles.thread, resolved && styles.threadResolved]
        .filter(Boolean)
        .join(" ")}>
      <header className={styles.threadHead}>
        <button
          type='button'
          className={styles.collapseToggle}
          onClick={() => {
            setCollapsed((prev) => !prev);
          }}
          aria-expanded={!collapsed}
          aria-label={collapsed ? "Expand thread" : "Collapse thread"}>
          {collapsed ? (
            <ChevronRightIcon className={styles.collapseIcon} />
          ) : (
            <ChevronDownIcon className={styles.collapseIcon} />
          )}
        </button>
        <span className={styles.threadAuthor}>
          {opener?.author.name ?? "Thread"}
        </span>
        {resolved && <span className={styles.resolvedBadge}>Resolved</span>}
        {collapsed && (
          <span className={styles.threadMeta}>
            {count} {count === 1 ? "comment" : "comments"}
          </span>
        )}
      </header>

      {!collapsed && (
        <div className={styles.threadBody}>
          <ul className={styles.comments}>
            {thread.comments.map((comment) => (
              <CommentRow
                key={comment.id}
                comment={comment}
                isAuthor={currentUserId === comment.author.userId}
                canInteract={canInteract}
                onEdit={(body) => onEdit(thread.id, comment.id, body)}
                onDelete={() => onDelete(thread.id, comment.id)}
              />
            ))}
          </ul>

          <div className={styles.threadActions}>
            {canInteract && !resolved && !showReplyBox && (
              <Btn
                size='sm'
                shape='pill'
                fill='ghost'
                icon={<ArrowUturnLeftIcon className={styles.actionIcon} />}
                onClick={() => {
                  setShowReplyBox(true);
                }}>
                Reply
              </Btn>
            )}
            {canInteract && (
              <Btn
                size='sm'
                shape='pill'
                fill='ghost'
                icon={<CheckCircleIcon className={styles.actionIcon} />}
                onClick={() => {
                  void onSetStatus(thread.id, resolved ? "OPEN" : "RESOLVED");
                }}>
                {resolved ? "Reopen" : "Resolve"}
              </Btn>
            )}
          </div>

          {canInteract && !resolved && showReplyBox && (
            <CommentEditor
              placeholder='Write a reply…'
              onCancel={() => {
                setShowReplyBox(false);
              }}
              onSubmit={(body) => {
                void Promise.resolve(onReply(thread.id, body)).then(() => {
                  setShowReplyBox(false);
                });
              }}
            />
          )}
        </div>
      )}
    </li>
  );
};

interface CommentRowProps {
  comment: CommentResponse;
  isAuthor: boolean;
  canInteract: boolean;
  onEdit: (body: string) => Promise<void> | void;
  onDelete: () => Promise<void> | void;
}

const CommentRow = ({
  comment,
  isAuthor,
  canInteract,
  onEdit,
  onDelete,
}: CommentRowProps) => {
  const [editing, setEditing] = useState(false);
  const isDeleted = comment.deleted;

  return (
    <li className={styles.comment}>
      <header className={styles.commentHead}>
        {comment.author.pictureUrl != null && comment.author.pictureUrl !== "" && (
          <img
            src={resolveAvatarSrc(comment.author.pictureUrl)}
            alt=''
            className={styles.avatar}
          />
        )}
        <span className={styles.commentAuthor}>{comment.author.name}</span>
        {comment.edited && !isDeleted && (
          <span className={styles.editedTag}>edited</span>
        )}
      </header>

      {editing && !isDeleted ? (
        <CommentEditor
          initialValue={comment.body ?? ""}
          submitLabel='Save'
          onCancel={() => {
            setEditing(false);
          }}
          onSubmit={(body) => {
            void Promise.resolve(onEdit(body)).then(() => {
              setEditing(false);
            });
          }}
        />
      ) : (
        <p
          className={[styles.commentBody, isDeleted && styles.commentBodyDeleted]
            .filter(Boolean)
            .join(" ")}>
          {isDeleted ? "[comment deleted]" : comment.body}
        </p>
      )}

      {!editing && canInteract && isAuthor && !isDeleted && (
        <div className={styles.commentActions}>
          <button
            type='button'
            className={styles.actionBtn}
            onClick={() => {
              setEditing(true);
            }}>
            <PencilIcon className={styles.actionIcon} />
            <span>Edit</span>
          </button>
          <button
            type='button'
            className={styles.actionBtn}
            onClick={() => {
              void onDelete();
            }}>
            <TrashIcon className={styles.actionIcon} />
            <span>Delete</span>
          </button>
        </div>
      )}
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
