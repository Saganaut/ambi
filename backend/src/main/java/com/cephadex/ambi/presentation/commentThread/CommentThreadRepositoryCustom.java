package com.cephadex.ambi.presentation.commentThread;

import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

/**
 * Targeted writes for a {@link CommentThread}'s embedded {@code comments} array
 * and its {@code status}. Comments are an independently-editable embedded
 * collection: many authors touch the same thread, so writing each change through
 * a whole-document {@code repository.save(thread)} rewrites the entire array and
 * is last-writer-wins — a concurrent reply or edit silently drops. These methods
 * persist only the touched element via {@code MongoTemplate.updateFirst}, the
 * same single-owner pattern as {@code DeckRepositoryImpl.updateSlideSettings}.
 *
 * <p>CommentThread has no {@code @Version} (it extends {@code BaseDocument}), so
 * unlike the deck case there is no optimistic-locking 500 to avoid — the win here
 * is purely not clobbering sibling comments on a concurrent write.
 */
public interface CommentThreadRepositoryCustom {

    /** Append one comment to the thread ({@code $push}); never rewrites siblings. */
    void appendComment(String threadId, Comment comment);

    /** Replace the comment with {@code commentId} in place (edit / soft-delete). */
    void replaceComment(String threadId, String commentId, Comment comment);

    /** Set the thread's lifecycle status without touching its comments. */
    void replaceStatus(String threadId, CommentThreadStatus status);
}
