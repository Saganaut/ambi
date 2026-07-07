package com.cephadex.ambi.session.event.dto;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;

/**
 * The participant-safe view of one asked Q&amp;A question, as carried by
 * {@code QAndAUpdated} and the session snapshot: the server-assigned question id
 * (the handle the host answers by), who asked it, the text, and the host's typed
 * answer when one exists.
 *
 * <p>{@code participantId} is {@code null} when the slide's effective answer
 * settings have {@code anonymizeAnswers} on — the asker never travels to
 * subscribers on an anonymised round.
 */
public record QAndAQuestionView(
        String id,
        String participantId,
        String text,
        Instant askedAt,
        String hostAnswer) {

    /**
     * Flattens the round's stored answers into one list of question views,
     * ordered by ask time, joining each question to its host answer (keyed by
     * question id). Non-Q&amp;A payloads in {@code answers} are ignored.
     */
    public static List<QAndAQuestionView> from(List<Answer> answers, Map<String, String> hostAnswers,
            boolean anonymize) {
        List<QAndAQuestionView> views = new ArrayList<>();
        for (Answer answer : answers) {
            if (!(answer.getPayload() instanceof QAndAQuestions questions) || questions.questions() == null) {
                continue;
            }
            String participantId = anonymize ? null : answer.getParticipantId();
            for (QAndAQuestions.Entry entry : questions.questions()) {
                views.add(new QAndAQuestionView(
                        entry.id(), participantId, entry.text(), entry.askedAt(),
                        hostAnswers.get(entry.id())));
            }
        }
        views.sort(Comparator.comparing((QAndAQuestionView view) -> view.askedAt(),
                Comparator.nullsLast(Comparator.naturalOrder())));
        return List.copyOf(views);
    }
}
