package com.cephadex.ambi.session.roundResult;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.AnswerRepository;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;

/**
 * The single home for the coordinated Mongo writes and reads of a closed round:
 * flush the round's in-flight answers (the durable source of truth), save the
 * participants whose scores {@code RoundScorer} mutated, then upsert the
 * {@link RoundResult} record. Lives in {@code session.roundResult} so it can see
 * the package-private {@link RoundResultRepository}, and keeps all three
 * round-result repositories out of {@code LiveSessionOrchestrator}'s constructor —
 * the orchestrator gains exactly one collaborator.
 */
@Component
public class RoundResultProjector {

    private final RoundResultRepository roundResults;
    private final AnswerRepository answers;
    private final ParticipantRepository participants;

    public RoundResultProjector(RoundResultRepository roundResults, AnswerRepository answers,
            ParticipantRepository participants) {
        this.roundResults = roundResults;
        this.answers = answers;
        this.participants = participants;
    }

    /**
     * Persists a closed round: {@code flushed} answers first (they are what the
     * result is derived from, so they must survive even if a later write fails),
     * then the score-mutated {@code roster}, then the record itself (keyed by
     * {@code (sessionId, slideId)}, so a re-close upserts rather than duplicates).
     */
    public void persist(RoundResult result, List<Participant> roster, List<Answer> flushed) {
        answers.saveAll(flushed);
        participants.saveAll(roster);
        roundResults.save(result);
    }

    /** The persisted result for one round, if it has been scored. */
    public Optional<RoundResult> find(String sessionId, String slideId) {
        return roundResults.findByIdSidAndIdSlideId(sessionId, slideId);
    }

    /** Every persisted round result for a session (for combined/terminal views). */
    public List<RoundResult> all(String sessionId) {
        return roundResults.findByIdSid(sessionId);
    }

    /**
     * The round's durably flushed answers — the fallback when Redis has aged out.
     * Empty until the round is closed and scored ({@link #persist} is what flushes
     * them), so a still-open round reads its answers from the Redis store instead.
     */
    public List<Answer> answersOf(String sessionId, String slideId) {
        return answers.findBySessionIdAndSlideId(sessionId, slideId);
    }
}
