package com.cephadex.ambi.session.redis;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.SessionTypes.ParticipantId;
import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;
import com.cephadex.ambi.session.answer.Answer;

/**
 * The in-flight answers for a live round, kept in Redis as a Hash with one field
 * per participant. While a round is open this is the runtime store the session
 * reads and writes; at round close the orchestrator flushes these to MongoDB
 * (the durable source of truth from which {@code RoundResult} is computed).
 *
 * <p>Keyed by {@code (sessionId, slideId)} via {@link SessionKeys#answersKey} —
 * the same round identity as {@link TallyStore} — with the participant id as the
 * hash field, so a participant <strong>re-submitting overwrites their own answer</strong>
 * (last write before reveal wins) and can never create a second entry. Like the
 * other session stores it does no locking: each {@link #submit} is a single
 * {@code HSET} keyed to one participant, so concurrent submissions from different
 * participants don't contend.
 */
@Component
public class AnswerStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public AnswerStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Records {@code answer} for its participant in the round, overwriting any
     * earlier submission from that participant, and refreshes the round's TTL.
     *
     * @throws NullPointerException if {@code answer} or its participant id is {@code null}
     */
    public void submit(SessionId sid, SlideId slideId, Answer answer) {
        Objects.requireNonNull(answer, "answer required");
        ParticipantId participantId = new ParticipantId(
                Objects.requireNonNull(answer.getParticipantId(), "answer.participantId required"));
        String key = keys.answersKey(sid, slideId);
        redis.<String, String>opsForHash().put(key, participantId.value(), codec.serialize(answer));
        redis.expire(key, props.getAnswers().getTtl());
    }

    /** This participant's answer for the round, or empty if they haven't submitted. */
    public Optional<Answer> answerOf(SessionId sid, SlideId slideId, ParticipantId participantId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        String json = ops.get(keys.answersKey(sid, slideId), participantId.value());
        return json == null ? Optional.empty() : Optional.of(codec.deserialize(json, Answer.class));
    }

    /** Every answer submitted for the round so far (the input to scoring at round close). */
    public List<Answer> answers(SessionId sid, SlideId slideId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        Map<String, String> raw = ops.entries(keys.answersKey(sid, slideId));
        List<Answer> answers = new ArrayList<>(raw.size());
        for (String json : raw.values()) {
            answers.add(codec.deserialize(json, Answer.class));
        }
        return answers;
    }

    /** How many participants have submitted this round, without deserializing them. */
    public long count(SessionId sid, SlideId slideId) {
        Long size = redis.opsForHash().size(keys.answersKey(sid, slideId));
        return size == null ? 0L : size;
    }

    /** Removes the round's answers (e.g. once flushed to Mongo, or on a round restart). */
    public void clear(SessionId sid, SlideId slideId) {
        redis.delete(keys.answersKey(sid, slideId));
    }
}