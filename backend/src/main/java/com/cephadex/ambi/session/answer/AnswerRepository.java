package com.cephadex.ambi.session.answer;

import java.util.List;

import org.springframework.data.mongodb.repository.MongoRepository;

/**
 * Durable store for submitted {@link Answer}s. In-flight answers live in the
 * Redis {@code AnswerStore} while a round is open; they are flushed here at round
 * close (the durable source of truth for scoring and history — the round result
 * is derived from these).
 */
public interface AnswerRepository extends MongoRepository<Answer, String> {

    List<Answer> findBySessionId(String sessionId);

    List<Answer> findBySessionIdAndSlideId(String sessionId, String slideId);

    /**
     * Drops one round's durable answers. Flushed answers carry no stable id, so a
     * re-scored round would otherwise insert a second batch alongside the first;
     * the flush deletes before it saves so the collection always holds exactly the
     * latest run of {@code (sessionId, slideId)}.
     */
    void deleteBySessionIdAndSlideId(String sessionId, String slideId);
}
