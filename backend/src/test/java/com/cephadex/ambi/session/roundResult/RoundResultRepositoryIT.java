package com.cephadex.ambi.session.roundResult;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.test.context.ActiveProfiles;

import com.cephadex.ambi.config.AmbiApplication;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.AnswerRepository;
import com.cephadex.ambi.session.answer.payload.McqAnswer;

import java.util.Set;

/**
 * Exercises the round-close repositories against the real Docker Mongo the test
 * profile points at. Loading the full context also proves the derived queries
 * resolve at bean creation — {@link RoundResultRepository}'s methods traverse the
 * composite {@code RoundResultId}'s plain-String {@code sid}/{@code slideId}
 * (a {@code ...Value} suffix would look for a non-existent {@code String.value}
 * and fail context startup). Scoped to a private session id and cleaned up after.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class RoundResultRepositoryIT {

    private static final String SID = "it-session-round-result-repository";
    private static final String SLIDE = "it-slide-1";

    @Autowired
    private RoundResultRepository roundResults;

    @Autowired
    private AnswerRepository answers;

    @Autowired
    private MongoTemplate mongoTemplate;

    @BeforeEach
    @AfterEach
    void clean() {
        mongoTemplate.remove(new Query(Criteria.where("_id.sid").is(SID)), RoundResult.class);
        mongoTemplate.remove(new Query(Criteria.where("session_id").is(SID)), Answer.class);
    }

    @Test
    void roundResultRoundTripsByCompositeIdQueries() {
        Slide slide = new Slide();
        slide.setId(SLIDE);
        roundResults.save(RoundResult.compute(SID, slide, List.of(), Instant.now()));

        assertThat(roundResults.findByIdSidAndIdSlideId(SID, SLIDE)).isPresent();
        assertThat(roundResults.findByIdSid(SID)).hasSize(1);
        assertThat(roundResults.findByIdSidAndIdSlideId(SID, "no-such-slide")).isEmpty();
    }

    @Test
    void answersQueryBySessionAndSlide() {
        answers.save(answer("p-1"));
        answers.save(answer("p-2"));

        assertThat(answers.findBySessionId(SID)).hasSize(2);
        assertThat(answers.findBySessionIdAndSlideId(SID, SLIDE)).hasSize(2);
        assertThat(answers.findBySessionIdAndSlideId(SID, "other")).isEmpty();
    }

    private static Answer answer(String participantId) {
        Answer a = new Answer();
        a.setParticipantId(participantId);
        a.setSessionId(SID);
        a.setSlideId(SLIDE);
        a.setSubmittedAt(Instant.now());
        a.setPayload(new McqAnswer(Set.of("opt-a")));
        return a;
    }
}
