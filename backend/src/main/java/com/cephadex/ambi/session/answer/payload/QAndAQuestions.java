package com.cephadex.ambi.session.answer.payload;

import java.time.Instant;
import java.util.List;

import com.cephadex.ambi.presentation.slide.enums.SlideType;

/**
 * A participant's accumulated Q&amp;A submissions — the <strong>stored</strong>
 * shape of a Q&amp;A answer. The answer model keeps one {@code Answer} per
 * participant per round, so a player asking several questions holds them all in
 * this ordered list; the orchestrator appends a {@link QuestionEntry} (with a
 * server-assigned id, so the host can address it when answering live) for each
 * incoming {@link QAndAAnswer}. Only built server-side: a client submitting this
 * type directly is rejected at validation.
 */
public record QAndAQuestions(List<QuestionEntry> questions) implements AnswerPayload {

    /**
     * One asked question. {@code id} is server-assigned and stable — the handle
     * host answers and (later) moderation attach to; {@code askedAt} orders the
     * round's questions across participants. Qualified name (not a bare
     * {@code Entry}) so the flat OpenAPI/TS namespace can't collide.
     */
    public record QuestionEntry(String id, String text, Instant askedAt) {
    }

    @Override
    public SlideType slideType() {
        return SlideType.Q_AND_A;
    }
}
