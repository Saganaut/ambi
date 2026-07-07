package com.cephadex.ambi.session.answer.payload;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * A single question submitted by a participant to the Q&amp;A slide — the
 * <strong>wire</strong> shape of a Q&amp;A submission. Unlike the other answer
 * payloads it is never stored as-is: the orchestrator appends it to the
 * participant's accumulated {@link QAndAQuestions} (a player may ask several
 * questions in one round, up to the slide's {@code maxResponses} cap).
 */
public record QAndAAnswer(String question) implements AnswerPayload {

    /** Upper bound on a submitted question's length, enforced at submission. */
    public static final int MAX_QUESTION_LENGTH = 500;

    @Override
    public SlideType slideType() {
        return SlideType.Q_AND_A;
    }
}
