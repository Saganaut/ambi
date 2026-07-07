package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import jakarta.validation.constraints.Size;

/**
 * A single question submitted by a participant to the Q&amp;A slide — the
 * <strong>wire</strong> shape of a Q&amp;A submission. Unlike the other answer
 * payloads it is never stored as-is: the orchestrator appends it to the
 * participant's accumulated {@link QAndAQuestions} (a player may ask several
 * questions in one round, up to the slide's {@code maxResponses} cap).
 *
 * <p>The length cap is a bean-validation {@code @Size} so it lands in the
 * OpenAPI schema (and the generated frontend validation constants); the answer
 * service re-checks it defensively.
 */
public record QAndAAnswer(
        @Size(max = ValidationConstants.QANDA_QUESTION_MAX) String question) implements AnswerPayload {

    @Override
    public SlideType slideType() {
        return SlideType.Q_AND_A;
    }
}
