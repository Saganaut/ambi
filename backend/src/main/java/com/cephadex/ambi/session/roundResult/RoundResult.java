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
     * ({@link RoundEvaluator} derives the facts once;
     * {@code Participant.awardPoints}
     * applies them and yields each outcome's points), so this only aggregates —
     * it never re-derives {@code correct} / fastest, keeping the record honest and
     * free of any payload/grading logic.
     */
    public static RoundResult compute(String sessionId, Slide slide, List<ParticipantOutcome> outcomes,
            Instant closedAt) {

        Objects.requireNonNull(sessionId);
        Objects.requireNonNull(slide);
        Objects.requireNonNull(outcomes);

        // Construct the round id from the session id and the slide's id (the
        // client-minted UUID carried verbatim into the session snapshot).

        RoundResult r = new RoundResult();
        r.id = new RoundResultId(sessionId, slide.getId());
        r.closedAt = closedAt;
        r.perParticipant = List.copyOf(outcomes);
        r.numberOfParticipants = outcomes.size();
        r.numberOfCorrectAnswers = (int) outcomes.stream().filter(o -> o.correct()).count();
        r.optionCounts = tallyOptions(outcomes);
        r.responseTimes = outcomes.stream().map(o -> (double) o.responseTimeMs()).toList();
        // correctOption is set by the grading owner via correctOption(...): the key
        // is derived from the slide by RoundEvaluator (the single place that reads
        // slide content), keeping this aggregation free of payload/grading logic.

        return r;
    }

    /**
     * Sets the revealed answer key for this round, collated in the same rendering
     * as {@link ParticipantOutcome#choice()} so it lines up with {@link #optionCounts}.
     * Package-private and set by {@link RoundScorer} from
     * {@link RoundEvaluator#correctKey(Slide)}; may be {@code null} for slides with no
     * static key. Returns {@code this} for fluent use at the scorer's return.
     */
    RoundResult correctOption(String correctOption) {
        this.correctOption = correctOption;
        return this;
    }

    private static Map<String, Integer> tallyOptions(List<ParticipantOutcome> outcomes) {
        Map<String, Integer> counts = new HashMap<>();
        for (ParticipantOutcome o : outcomes) {
            if (o.choice() != null) {
                counts.merge(o.choice(), 1, (a, b) -> a + b);
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
                .mapToDouble(d -> d.doubleValue()).average().orElse(0.0);
        return totalTime;
    }
}
