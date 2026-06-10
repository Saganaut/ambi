package com.cephadex.ambi.presentation.commentThread.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.function.UnaryOperator;

import com.cephadex.ambi.presentation.commentThread.Author;
import com.cephadex.ambi.presentation.commentThread.Comment;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a single {@link Comment} within a thread. A thread is a flat
 * conversation, so a comment carries no nesting of its own — the opener and its
 * replies are just the thread's ordered comment list. A soft-deleted comment
 * keeps its row so the conversation stays intact, but its {@code body} is
 * redacted to {@code null}.
 */
public record CommentResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) AuthorResponse author,
        String body,
        @Schema(requiredMode = REQUIRED) boolean edited,
        @Schema(requiredMode = REQUIRED) boolean deleted) {

    /**
     * Projects a stored {@link Comment} onto its response. {@code resolveAuthor}
     * maps the stored author snapshot to what should be serialized — the service
     * passes an overlay that swaps in the user's current display name and avatar
     * (see {@code CommentThreadService#freshAuthors}).
     */
    public static CommentResponse from(Comment comment, UnaryOperator<Author> resolveAuthor) {
        boolean deleted = Boolean.TRUE.equals(comment.deleted());
        Author author = comment.author();
        return new CommentResponse(
                comment.id(),
                AuthorResponse.from(author != null ? resolveAuthor.apply(author) : null),
                deleted ? null : comment.body(),
                Boolean.TRUE.equals(comment.edited()),
                deleted);
    }
}
