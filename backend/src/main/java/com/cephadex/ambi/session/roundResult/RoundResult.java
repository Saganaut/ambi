package com.cephadex.ambi.session.roundResult;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.SessionTypes.ParticipantOutcome;
import com.cephadex.ambi.session.SessionTypes.RoundResultId;
import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;
import com.cephadex.ambi.session.answer.Answer;

@Document(collection = "round_results")
public class RoundResult {

    @Id
    // Round result is combo of sessionId and slideId
    private RoundResultId id;

    private int numberOfParticipants;

    private List<ParticipantOutcome> perParticipant;

    private Map<String, Integer> optionCounts;

    private int numberOfCorrectAnswers;

    private List<Double> responseTimes;

    private Instant closedAt;

    private String correctOption;

    private RoundResult() {
    }

    // TODO: Fill out the compute function after finishing answers + slides
    public static RoundResult compute(SessionId sid, Slide slide, List<Answer> answers, Instant closedAt) {

        // Check Id is not null, slide is not null and answers is not null.
        Objects.requireNonNull(sid);
        Objects.requireNonNull(slide);
        Objects.requireNonNull(answers);

        // Construct the round id from the session id and slide.publicId
        SlideId slideId = new SlideId(slide.getPublicId());
        RoundResultId roundResultId = new RoundResultId(sid, slideId);

        // Construct the RoundResult object
        RoundResult r = new RoundResult();
        r.id = roundResultId;

        return r;

    }

    public RoundResultId id() {
        return id;
    }

    public Instant closedAt() {
        return closedAt;
    }

    public int numberOfParticipants() {
        return numberOfParticipants;
    }

    public int numberOfCorrectAnswers() {
        return numberOfCorrectAnswers;
    }

    public Map<String, Integer> optionCounts() {
        return optionCounts;
    }

    public Optional<String> correctOption() {
        return Optional.ofNullable(correctOption);
    }

    public List<ParticipantOutcome> perParticipant() {
        return perParticipant;
    }

    public double averageResponseTime() {
        double totalTime = responseTimes.stream()
                .mapToDouble(Double::doubleValue).average().orElse(0.0);
        return totalTime;
    }
}
