package com.cephadex.ambi.session.roundResult;

import java.time.Instant;
import java.util.HashMap;
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

    /**
     * Assemble the immutable per-round record from already-scored
     * {@link ParticipantOutcome}s. Scoring and fact-derivation happen upstream
     * ({@link RoundEvaluator} derives the facts once; {@code Participant.awardPoints}
     * applies them and yields each outcome's points), so this only aggregates —
     * it never re-derives {@code correct} / fastest, keeping the record honest and
     * free of any payload/grading logic.
     */
    public static RoundResult compute(SessionId sid, Slide slide, List<ParticipantOutcome> outcomes, Instant closedAt) {

        Objects.requireNonNull(sid);
        Objects.requireNonNull(slide);
        Objects.requireNonNull(outcomes);

        // Construct the round id from the session id and the slide's id (the
        // client-minted UUID carried verbatim into the session snapshot).
        SlideId slideId = new SlideId(slide.getId());

        RoundResult r = new RoundResult();
        r.id = new RoundResultId(sid, slideId);
        r.closedAt = closedAt;
        r.perParticipant = List.copyOf(outcomes);
        r.numberOfParticipants = outcomes.size();
        r.numberOfCorrectAnswers = (int) outcomes.stream().filter(ParticipantOutcome::correct).count();
        r.optionCounts = tallyOptions(outcomes);
        r.responseTimes = outcomes.stream().map(o -> (double) o.responseTimeMs()).toList();
        // correctOption — SEAM: needs the slide's answer key (see RoundEvaluator.isCorrect).

        return r;
    }

    private static Map<String, Integer> tallyOptions(List<ParticipantOutcome> outcomes) {
        Map<String, Integer> counts = new HashMap<>();
        for (ParticipantOutcome o : outcomes) {
            if (o.choice() != null) {
                counts.merge(o.choice(), 1, Integer::sum);
            }
        }
        return counts;
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
