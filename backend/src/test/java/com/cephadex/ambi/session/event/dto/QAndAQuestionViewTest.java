package com.cephadex.ambi.session.event.dto;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.McqAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;

/**
 * Assembly of the wire-safe Q&amp;A question list: flattened across participants
 * in ask order, host answers joined by question id, and the asker stripped when
 * the round anonymizes answers.
 */
class QAndAQuestionViewTest {

    private static final Instant T0 = Instant.parse("2026-01-01T00:00:00Z");

    @Test
    void flattensAcrossParticipantsInAskOrderAndJoinsHostAnswers() {
        Answer alice = answerOf("p-alice", new QAndAQuestions(List.of(
                entry("q-1", "First?", 0),
                entry("q-3", "Third?", 20))));
        Answer bob = answerOf("p-bob", new QAndAQuestions(List.of(
                entry("q-2", "Second?", 10))));

        List<QAndAQuestionView> views = QAndAQuestionView.from(
                List.of(alice, bob), Map.of("q-2", "Answered live."), false);

        assertThat(views.stream().map(view -> view.id()).toList()).containsExactly("q-1", "q-2", "q-3");
        assertThat(views.get(0).participantId()).isEqualTo("p-alice");
        assertThat(views.get(1).hostAnswer()).isEqualTo("Answered live.");
        assertThat(views.get(0).hostAnswer()).isNull();
    }

    @Test
    void anonymizedRoundCarriesNoParticipantIds() {
        Answer asked = answerOf("p-alice", new QAndAQuestions(List.of(entry("q-1", "Who?", 0))));

        List<QAndAQuestionView> views = QAndAQuestionView.from(List.of(asked), Map.of(), true);

        assertThat(views).singleElement().satisfies(v -> {
            assertThat(v.participantId()).isNull();
            assertThat(v.text()).isEqualTo("Who?");
        });
    }

    @Test
    void ignoresNonQandaPayloads() {
        Answer mcq = answerOf("p-1", new McqAnswer(java.util.Set.of("opt-a")));

        assertThat(QAndAQuestionView.from(List.of(mcq), Map.of(), false)).isEmpty();
    }

    private static QAndAQuestions.Entry entry(String id, String text, long msAfterT0) {
        return new QAndAQuestions.Entry(id, text, T0.plusMillis(msAfterT0));
    }

    private static Answer answerOf(String participantId, AnswerPayload payload) {
        Answer a = new Answer();
        a.setParticipantId(participantId);
        a.setSessionId("sess-1");
        a.setSlideId("slide-1");
        a.setSubmittedAt(T0);
        a.setPayload(payload);
        return a;
    }
}
