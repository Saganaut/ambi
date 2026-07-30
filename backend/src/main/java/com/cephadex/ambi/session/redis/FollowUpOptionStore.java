package com.cephadex.ambi.session.redis;

import java.util.Objects;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

/**
 * The candidate set a follow-up round votes on, minted from the parent round's
 * submissions and snapshotted here for the life of the round.
 *
 * <p>
 * Unlike the sibling round stores this is a single JSON <em>string</em> value,
 * not a Hash: the board's <strong>order matters</strong> — every participant
 * votes against the same numbered list — and a Redis Hash has no order to
 * preserve, so the whole {@link FollowUpOptionSet} is written and read as one
 * value. It is written once when the round opens (a restart re-mints the same
 * set, since {@link FollowUpOption} ids are derived from their content), so
 * there is no partial-update case a Hash would buy anything for.
 *
 * <p>
 * Runtime-only, like the vote tallies: the follow-up's <em>answers</em> are
 * flushed to MongoDB as normal, and the snapshot they point at expires with the
 * session's TTL. The {@code authorParticipantIds} on each option stay
 * server-side — never project this record onto the wire directly.
 */
@Component
public class FollowUpOptionStore {

    private final StringRedisTemplate redis;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public FollowUpOptionStore(StringRedisTemplate redis, RedisJsonCodec codec, SessionKeys keys,
            SessionRedisProperties props) {
        this.redis = redis;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Snapshots the round's minted candidates (replacing any prior set — a round
     * re-open starts from a fresh mint) and stamps the TTL.
     */
    public void save(String sessionId, String slideId, FollowUpOptionSet options) {
        Objects.requireNonNull(options, "options required");
        redis.opsForValue().set(keys.followUpOptionsKey(sessionId, slideId), codec.serialize(options),
                props.getFollowUp().getTtl());
    }

    /**
     * The round's candidates in board order, or {@link FollowUpOptionSet#empty()}
     * when the round never opened (or its snapshot has expired).
     */
    public FollowUpOptionSet load(String sessionId, String slideId) {
        String json = redis.opsForValue().get(keys.followUpOptionsKey(sessionId, slideId));
        return json == null ? FollowUpOptionSet.empty() : codec.deserialize(json, FollowUpOptionSet.class);
    }

    /** Removes the round's candidates (on a round re-open, or when the session ends). */
    public void clear(String sessionId, String slideId) {
        redis.delete(keys.followUpOptionsKey(sessionId, slideId));
    }
}
