package com.cephadex.ambi.session.answer.dto;

import com.cephadex.ambi.session.answer.payload.AnswerPayload;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Body of {@code POST /api/liveSessions/{id}/answers}: which open slide the answer
 * is for, plus the polymorphic {@link AnswerPayload} (discriminated on
 * {@code answerType}). The session id is the path variable, not part of the body.
 */
public record SubmitAnswerRequest(
        @NotBlank String slideId,
        @NotNull @Valid AnswerPayload payload) {
}
