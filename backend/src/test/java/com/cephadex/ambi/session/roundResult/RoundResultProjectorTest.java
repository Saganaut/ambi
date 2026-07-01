package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.inOrder;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.Test;
import org.mockito.InOrder;

import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.AnswerRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;

/**
 * The projector writes in a fixed order (answers → participants → result) and
 * delegates its reads to the repository.
 */
class RoundResultProjectorTest {

    private final RoundResultRepository roundResults = mock(RoundResultRepository.class);
    private final AnswerRepository answers = mock(AnswerRepository.class);
    private final ParticipantRepository participants = mock(ParticipantRepository.class);
    private final RoundResultProjector projector =
            new RoundResultProjector(roundResults, answers, participants);

    @Test
    void persistsAnswersThenParticipantsThenResult() {
        RoundResult result = mock(RoundResult.class);
        List<Answer> flushed = List.of(new Answer());
        List<Participant> roster = List.of(Participant.join("u", "n", null, null));

        projector.persist(result, roster, flushed);

        InOrder order = inOrder(answers, participants, roundResults);
        order.verify(answers).saveAll(flushed);
        order.verify(participants).saveAll(roster);
        order.verify(roundResults).save(result);
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
}
