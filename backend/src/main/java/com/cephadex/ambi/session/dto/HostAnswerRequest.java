package com.cephadex.ambi.session.dto;

import com.cephadex.ambi.common.validation.ValidationConstants;

import jakarta.validation.constraints.Size;

/**
 * Body of {@code POST /api/liveSessions/{id}/rounds/{slideId}/questions/{questionId}/host-answer}:
 * the answer the host types next to a Q&amp;A question. Blank or {@code null}
 * clears a previously typed answer, so there is no {@code @NotBlank} here.
 */
public record HostAnswerRequest(
        @Size(max = ValidationConstants.QANDA_HOST_ANSWER_MAX) String answer) {
}
