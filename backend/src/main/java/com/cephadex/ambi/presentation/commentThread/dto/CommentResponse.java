package com.cephadex.ambi.presentation.commentThread.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

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

    /** Projects a stored {@link Comment} onto its response. */
    public static CommentResponse from(Comment comment) {
        boolean deleted = Boolean.TRUE.equals(comment.deleted());
        return new CommentResponse(
                comment.id(),
                AuthorResponse.from(comment.author()),
                deleted ? null : comment.body(),
                Boolean.TRUE.equals(comment.edited()),
                deleted);
    }
}
