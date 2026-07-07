package com.cephadex.ambi.session.redis;

import java.util.Map;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

/**
 * The host's typed answers for a Q&amp;A round, kept in Redis as a Hash with one
 * field per question id (the server-assigned id on
 * {@code QAndAQuestions.QuestionEntry}). Session-scoped runtime state like
 * {@link TallyStore}: it exists so the answer the host types next to a question
 * survives a client refresh (the snapshot re-reads it) and fans out to every
 * subscriber, but it is never flushed to Mongo — a Q&amp;A round's durable record
 * is the participants' questions, not the host's live commentary.
 *
 * <p>Keyed by {@code (sessionId, slideId)} via {@link SessionKeys#qandaHostAnswersKey}
 * — the same round identity as the other per-round stores — and, like them, does
 * no locking: each write is a single field {@code HSET}/{@code HDEL}.
 */
@Component
public class QAndAHostAnswerStore {

    private final StringRedisTemplate redis;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public QAndAHostAnswerStore(StringRedisTemplate redis, SessionKeys keys, SessionRedisProperties props) {
        this.redis = redis;
        this.keys = keys;
        this.props = props;
    }

    /** Records the host's answer for a question, overwriting any earlier one. */
    public void put(String sessionId, String slideId, String questionId, String answer) {
        String key = keys.qandaHostAnswersKey(sessionId, slideId);
        redis.<String, String>opsForHash().put(key, questionId, answer);
        redis.expire(key, props.getQandaHostAnswers().getTtl());
    }

    /** Clears the host's answer for a question (the host emptied the field). */
    public void remove(String sessionId, String slideId, String questionId) {
        redis.opsForHash().delete(keys.qandaHostAnswersKey(sessionId, slideId), questionId);
    }

    /** Every host answer for the round, keyed by question id. */
    public Map<String, String> all(String sessionId, String slideId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        return ops.entries(keys.qandaHostAnswersKey(sessionId, slideId));
    }

    /** Removes the round's host answers (on a round restart). */
    public void clear(String sessionId, String slideId) {
        redis.delete(keys.qandaHostAnswersKey(sessionId, slideId));
    }
}
