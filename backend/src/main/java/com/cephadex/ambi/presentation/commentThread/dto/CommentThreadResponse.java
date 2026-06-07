package com.cephadex.ambi.presentation.commentThread.dto;

import static io.swagger.v3.oas.annotations.media.Schema.RequiredMode.REQUIRED;

import java.util.List;

import com.cephadex.ambi.presentation.commentThread.CommentThread;
import com.cephadex.ambi.presentation.commentThread.enums.CommentThreadStatus;

import io.swagger.v3.oas.annotations.media.Schema;

/**
 * The wire view of a {@link CommentThread}: a discussion anchored to a slide,
 * carrying its full comment list inline (the opener first, then replies in
 * order). Threads are small conversations, so comments are returned whole rather
 * than lazily. {@code status} is the thread's lifecycle state ({@code OPEN} /
 * {@code RESOLVED}).
 */
public record CommentThreadResponse(
        @Schema(requiredMode = REQUIRED) String id,
        @Schema(requiredMode = REQUIRED) String slideId,
        @Schema(requiredMode = REQUIRED) CommentThreadStatus status,
        @Schema(requiredMode = REQUIRED) List<CommentResponse> comments) {

    /** Projects a stored {@link CommentThread} onto its response. */
    public static CommentThreadResponse from(CommentThread thread) {
        List<CommentResponse> comments = thread.getComments().stream()
                .map(CommentResponse::from)
                .toList();
        return new CommentThreadResponse(
                thread.getId(), thread.getSlideId(), thread.getStatus(), comments);
    }
}
