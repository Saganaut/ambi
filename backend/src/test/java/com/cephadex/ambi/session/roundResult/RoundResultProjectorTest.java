package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.mockito.InOrder;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.AnswerRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;

/**
 * The projector writes in a fixed order (answers → participants → result),
 * replaces a round's durable answers rather than appending to them, and delegates
 * its reads to the repository.
 */
class RoundResultProjectorTest {

    private static final String SID = "s";
    private static final String SLIDE = "slide";

    private final RoundResultRepository roundResults = mock(RoundResultRepository.class);
    private final AnswerRepository answers = mock(AnswerRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final RoundResultProjector projector =
            new RoundResultProjector(roundResults, answers, participants);

    @Test
    void persistsAnswersThenParticipantsThenResult() {
        RoundResult result = result();
        List<Answer> flushed = List.of(new Answer());
        List<Participant> roster = List.of(Participant.join("u", "n", null, null));

        projector.persist(result, roster, flushed);

        InOrder order = inOrder(answers, participants, roundResults);
        order.verify(answers).saveAll(flushed);
        order.verify(participants).saveAll(roster);
        order.verify(roundResults).save(result);
    }

    @Test
    void persistReplacesTheRoundsExistingAnswersBeforeSavingTheFlushedBatch() {
        // A replayed round (the host reopens an already-scored slide) re-persists
        // the same (sessionId, slideId). Flushed answers carry no id, so every save
        // inserts — without the delete the superseded run would survive alongside
        // the new one and answersOf would return the union of both.
        List<Answer> flushed = List.of(new Answer());

        projector.persist(result(), List.of(), flushed);

        InOrder order = inOrder(answers);
        order.verify(answers).deleteBySessionIdAndSlideId(SID, SLIDE);
        order.verify(answers).saveAll(flushed);
    }

    @Test
    void answersOfReturnsOnlyWhatTheLatestPersistWrote() {
        // Against a collection that inserts every save (flushed answers have no id),
        // re-scoring the round must not leave the first run readable: the follow-up
        // board mints its candidates from this read.
        List<Answer> stored = new ArrayList<>();
        stubStore(stored);
        Answer first = answer("p-1");
        Answer second = answer("p-2");

        projector.persist(result(), List.of(), List.of(first));
        projector.persist(result(), List.of(), List.of(second));

        assertThat(projector.answersOf(SID, SLIDE)).containsExactly(second);
    }

    @Test
    void findDelegatesToRepository() {
        RoundResult result = mock(RoundResult.class);
        when(roundResults.findByIdSidAndIdSlideId("s", "slide")).thenReturn(Optional.of(result));

        assertThat(projector.find("s", "slide")).contains(result);
    }

    @Test
    void allDelegatesToRepository() {
        RoundResult result = mock(RoundResult.class);
        when(roundResults.findByIdSid("s")).thenReturn(List.of(result));

        assertThat(projector.all("s")).containsExactly(result);
    }

    /** A real (empty) record for the round under test — persist reads its id. */
    private static RoundResult result() {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        return RoundResult.compute(SID, slide, List.of(), Instant.now());
    }

    private static Answer answer(String participantId) {
        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(SID);
        answer.setSlideId(SLIDE);
        return answer;
    }

    /**
     * Backs the repository mock with {@code stored}, mimicking the collection's
     * insert-only saves: {@code saveAll} appends (nothing carries an id to match
     * on) and the derived delete removes the round's documents.
     */
    private void stubStore(List<Answer> stored) {
        when(answers.saveAll(ArgumentMatchers.<List<Answer>>any())).thenAnswer(call -> {
            List<Answer> batch = call.getArgument(0);
            stored.addAll(batch);
            return batch;
        });
        doAnswer(call -> {
            String sessionId = call.getArgument(0);
            String slideId = call.getArgument(1);
            stored.removeIf(a -> sessionId.equals(a.getSessionId()) && slideId.equals(a.getSlideId()));
            return null;
        }).when(answers).deleteBySessionIdAndSlideId(SID, SLIDE);
        // The live list, so the read reflects whatever the persists left behind.
        when(answers.findBySessionIdAndSlideId(SID, SLIDE)).thenReturn(stored);
    }
}
