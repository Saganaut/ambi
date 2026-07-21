package com.cephadex.ambi.session.redis;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;

import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;

/**
 * The in-flight best-answer voting of a live round (D3), kept in Redis as two
 * Hashes sharing the round identity {@code (sessionId, slideId)}:
 *
 * <ul>
 * <li><strong>options</strong> ({@link SessionKeys#voteOptionsKey}) — the
 * votable submissions, one field per <em>opaque option id</em> minted when
 * voting opens, valued with the {@link VoteOption} it stands for. The
 * option→author mapping never leaves the server, so clients can't
 * de-anonymise a deception round;</li>
 * <li><strong>votes</strong> ({@link SessionKeys#votesKey}) — the cast votes,
 * one field per voter with the chosen option id as the value, so a
 * participant <strong>re-voting overwrites their own vote</strong> (last
 * write while voting is open wins) and can never cast two.</li>
 * </ul>
 *
 * <p>Like the other session stores it does no locking: {@link #castVote} is a
 * single {@code HSET} keyed to one voter, so concurrent votes from different
 * participants don't contend. The tallies fold into scoring at results reveal;
 * nothing here is flushed to MongoDB.
 */
@Component
public class VoteStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public VoteStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Stores the round's minted vote options (replacing any prior set — voting
     * re-open after a restart starts clean) and stamps the TTL.
     */
    public void saveOptions(String sessionId, String slideId, Map<String, VoteOption> optionsById) {
        Objects.requireNonNull(optionsById, "optionsById required");
        String key = keys.voteOptionsKey(sessionId, slideId);
        redis.delete(key);
        Map<String, String> serialized = new HashMap<>(optionsById.size());
        optionsById.forEach((optionId, option) -> serialized.put(optionId, codec.serialize(option)));
        redis.<String, String>opsForHash().putAll(key, serialized);
        redis.expire(key, props.getVotes().getTtl());
    }

    /** The round's vote options keyed by opaque option id (empty if voting never opened). */
    public Map<String, VoteOption> options(String sessionId, String slideId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        Map<String, String> raw = ops.entries(keys.voteOptionsKey(sessionId, slideId));
        Map<String, VoteOption> options = new HashMap<>(raw.size());
        raw.forEach((optionId, json) -> options.put(optionId, codec.deserialize(json, VoteOption.class)));
        return options;
    }

    /**
     * Records {@code voterParticipantId}'s vote for {@code optionId}, overwriting
     * any earlier vote from the same voter, and refreshes the round's TTL.
     */
    public void castVote(String sessionId, String slideId, String voterParticipantId, String optionId) {
        Objects.requireNonNull(voterParticipantId, "voterParticipantId required");
        Objects.requireNonNull(optionId, "optionId required");
        String key = keys.votesKey(sessionId, slideId);
        redis.<String, String>opsForHash().put(key, voterParticipantId, optionId);
        redis.expire(key, props.getVotes().getTtl());
    }

    /** This participant's vote (the option id they chose), or empty if they haven't voted. */
    public Optional<String> voteOf(String sessionId, String slideId, String participantId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        return Optional.ofNullable(ops.get(keys.votesKey(sessionId, slideId), participantId));
    }

    /** Every cast vote of the round so far, keyed by voter (the input to scoring at reveal). */
    public Map<String, String> votes(String sessionId, String slideId) {
        HashOperations<String, String, String> ops = redis.opsForHash();
        return new HashMap<>(ops.entries(keys.votesKey(sessionId, slideId)));
    }

    /** How many participants have voted this round, without reading the votes. */
    public long count(String sessionId, String slideId) {
        Long size = redis.opsForHash().size(keys.votesKey(sessionId, slideId));
        return size == null ? 0L : size;
    }

    /** Removes the round's votes and options (on round (re)open, or when the session ends). */
    public void clear(String sessionId, String slideId) {
        redis.delete(keys.votesKey(sessionId, slideId));
        redis.delete(keys.voteOptionsKey(sessionId, slideId));
    }
}
