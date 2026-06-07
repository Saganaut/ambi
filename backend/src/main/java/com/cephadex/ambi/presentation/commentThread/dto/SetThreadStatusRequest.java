package com.cephadex.ambi.presentation.commentThread.dto;

import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

import jakarta.validation.constraints.NotNull;

/**
 * {@code PATCH …/comment-threads/{threadId}} body — move a thread between its
 * lifecycle states. Used to resolve an open thread or reopen a resolved one.
 *
 * @param status the thread's new status.
 */
public record SetThreadStatusRequest(
        @NotNull CommentThreadStatus status) {
}
