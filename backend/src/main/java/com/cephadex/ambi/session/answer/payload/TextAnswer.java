package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.common.validation.ValidationConstants;
import com.cephadex.ambi.presentation.slide.enums.SlideType;

import jakarta.validation.constraints.Size;

/**
 * Covers free-text and wordcloud submissions (wordcloud belongs to TEXT).
 *
 * <p>The length cap is a bean-validation {@code @Size} so it lands in the
 * OpenAPI schema (and the generated frontend validation constants); the answer
 * service re-checks it defensively, and additionally enforces any tighter
 * per-slide {@code maxLength} the author set.
 */
public record TextAnswer(
        @Size(max = ValidationConstants.TEXT_ANSWER_MAX) String text) implements AnswerPayload {
    @Override
    public SlideType slideType() {
        return SlideType.TEXT;
    }
}
