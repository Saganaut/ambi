package com.cephadex.ambi.presentation.commentThread.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * The text payload shared by every comment write: opening a thread, replying in
 * one, and editing a comment. A thread always opens with a comment — there are
 * no empty threads — so this same body starts the conversation.
 *
 * @param body the comment text.
 */
public record CommentBodyRequest(
        @NotBlank
        @Size(max = ValidationConstants.COMMENT_BODY_MAX)
        String body) {
}
