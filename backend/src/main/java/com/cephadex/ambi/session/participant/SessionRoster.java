package com.cephadex.ambi.session.participant;

import java.util.ArrayList;
import java.util.List;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SessionEventPayload;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * Who is in a run. The durable record is the {@link Participant} collection —
 * each document points up at its session by {@code sessionId}, the same
 * child→parent shape {@code Answer} and {@code RoundResult} already use — and a
 * Redis SET ({@link SessionKeys#rosterKey}) fronts it as the live membership
 * index.
 *
 * <p><strong>Why a Redis SET.</strong> Admitting a player has to enforce the
 * participant cap and record the membership without two joins racing past the
 * limit or losing each other's write. As a set that is one atomic
 * {@code SCARD}+{@code SADD}, which {@link #admit} does in the same script that
 * allocates the event sequence and publishes — so the join path needs no session
 * lock, and concurrent joins never collide (they used to 409 with
 * {@code SESSION_LOCKED}).
 *
 * <p><strong>Distinct from presence.</strong> {@code PresenceStore} answers "who
 * is connected right now"; this answers "who is in this run". A disconnect never
 * removes a member — only an explicit {@link #remove} does.
 *
 * <p><strong>Self-healing.</strong> The set is a cache: eviction, a TTL lapse, or
 * a Redis restart leaves it missing, and every read here falls back to MongoDB
 * and writes what it found back. Nothing but a durable {@code leftAt} can take a
 * participant off the roster, so a rehydrate can't resurrect someone who left.
 * The healing is add-only — no heal ever prunes, only an explicit
 * {@link #remove} or {@link #clear} does — and the admit script's
 * {@code PEXPIRE} refreshes the TTL on every join, so a phantom member that
 * slips past a join's rollback stays for the session's life.
 */
@Component
public class SessionRoster {

    /**
     * Atomic admit-and-announce. {@code KEYS} is {@code [rosterKey,
     * eventSequenceKey]}; {@code ARGV} is {@code [participantId, cap, rosterTtlMillis,
     * sequenceTtlMillis, channel, payloadPrefix, payloadSuffix]}. Returns the
     * allocated sequence, or {@code -1} when the session is already at its cap
     * (nothing is added and nothing is published). Mirrors
     * {@code RedisEventPublisher.SCRIPT}: the sequence is spliced into
     * pre-serialized JSON fragments, so Lua only ever contributes an integer.
     *
     * <p>The cap counts the seats <em>other</em> members hold: a joiner the set
     * already carries is discounted from the cardinality rather than waved past the
     * check. That keeps the two cases the set can be in honest — a concurrent
     * rehydrate that pre-seeded the joiner's own durable document (a heal from
     * another request passes no exclude id) has not given them a seat, so the
     * discount restores the count the cap should see; a retry after a {@code SADD}
     * that landed finds them occupying a counted seat, so the discount cancels it
     * and the admit stays idempotent. Waiving the check outright would instead let
     * any pre-seeded id join a session already at its limit.
     */
    private static final RedisScript<Long> ADMIT = new DefaultRedisScript<>("""
            local held = redis.call('sismember', KEYS[1], ARGV[1])
            if redis.call('scard', KEYS[1]) - held >= tonumber(ARGV[2]) then return -1 end
            redis.call('sadd', KEYS[1], ARGV[1])
            redis.call('pexpire', KEYS[1], ARGV[3])
            local sequence = redis.call('incr', KEYS[2])
            redis.call('pexpire', KEYS[2], ARGV[4])
            redis.call('publish', ARGV[5], ARGV[6] .. sequence .. ARGV[7])
            return sequence""", Long.class);

    private final StringRedisTemplate redis;
    private final ParticipantRepository participants;
    private final RedisJsonCodec codec;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public SessionRoster(StringRedisTemplate redis, ParticipantRepository participants, RedisJsonCodec codec,
            SessionKeys keys, SessionRedisProperties props) {
        this.redis = redis;
        this.participants = participants;
        this.codec = codec;
        this.keys = keys;
        this.props = props;
    }

    /**
     * The session's roster in join order, straight from the durable documents —
     * the Redis set holds ids only, and order is load-bearing for the snapshot.
     */
    public List<Participant> participants(String sessionId) {
        return participants.findBySessionIdAndLeftAtIsNullOrderByJoinedAtAsc(sessionId);
    }

    /**
     * Adds a participant with no cap check and no event — the session's own host,
     * who is on the roster by construction and has nobody subscribed to tell.
     */
    public void add(String sessionId, String participantId) {
        String key = keys.rosterKey(sessionId);
        redis.opsForSet().add(key, participantId);
        redis.expire(key, props.getRoster().getTtl());
    }

    /**
     * Admits {@code participantId} to the session and publishes {@code event} in
     * one atomic step, rejecting the join if the roster is already at
     * {@code maxParticipants}. The participant's document must already be saved —
     * this only records the membership.
     *
     * <p>The joiner's own document is already durable when this runs, so the
     * rehydrate that precedes the cap check excludes {@code participantId} —
     * counting it would seed the set with the very member the script is about to
     * add and reject the last free seat.
     *
     * @return {@code true} when admitted; {@code false} when the session is full
     *         (nothing added, nothing published)
     * @throws IllegalStateException if the script returns no reply (a Redis
     *                               failure, not a full session)
     */
    public boolean admit(String sessionId, String publicId, String participantId, int maxParticipants,
            SessionEvent event) {
        rehydrateIfMissing(sessionId, participantId);
        SessionEventPayload payload = SessionEventPayload.of(codec, publicId, event);
        Long sequence = redis.execute(ADMIT,
                List.of(keys.rosterKey(sessionId), keys.eventSequenceKey(publicId)),
                participantId,
                String.valueOf(maxParticipants),
                String.valueOf(props.getRoster().getTtl().toMillis()),
                String.valueOf(props.getEventSequence().getTtl().toMillis()),
                props.getEvents().getChannel(),
                payload.prefix(),
                payload.suffix());
        if (sequence == null) {
            throw new IllegalStateException("roster admit script returned no reply for session " + sessionId);
        }
        return sequence > 0;
    }

    /**
     * Drops a participant from the live membership — an explicit leave, or the
     * rollback of a join the roster refused or failed to complete.
     */
    public void remove(String sessionId, String participantId) {
        redis.opsForSet().remove(keys.rosterKey(sessionId), participantId);
    }

    /**
     * Whether {@code participantId} is on the session's roster. A {@code SISMEMBER}
     * miss is re-checked against MongoDB and healed back into the set, so an
     * evicted key costs one slower read instead of locking a participant out of
     * their own session.
     *
     * <p>An absent key is rebuilt <em>whole</em>, not just with the member asked
     * about: a lone {@code SADD} would re-create the key with one id, and
     * {@link #rehydrateIfMissing} — which only seeds an absent key — could never
     * repair it again, so every later {@link #admit} would check its cap against a
     * set missing everyone who did not happen to call this method. The single-member
     * heal is therefore reserved for a key that is already live, where it can add
     * nothing but the id it was asked about to a set Redis is still holding.
     */
    public boolean contains(String sessionId, String participantId) {
        if (Boolean.TRUE.equals(redis.opsForSet().isMember(keys.rosterKey(sessionId), participantId))) {
            return true;
        }
        if (!participants.existsByParticipantIdAndSessionIdAndLeftAtIsNull(participantId, sessionId)) {
            return false;
        }
        boolean keyWasLive = rehydrateIfMissing(sessionId, null);
        if (keyWasLive) {
            add(sessionId, participantId);
        }
        return true;
    }

    /** Drops the session's membership set (the session reached a terminal state). */
    public void clear(String sessionId) {
        redis.delete(keys.rosterKey(sessionId));
    }

    /**
     * Seeds the set from the durable roster when the key is absent, so the cap
     * check that follows counts the real membership. Idempotent: {@code SADD} of
     * an existing member is a no-op, so a concurrent join can't be undone by a
     * rehydrate that overlaps it.
     *
     * <p>An absent key with nothing durable to seed it from is left absent: writing
     * a partial set would strand the roster below the real membership with no way
     * to rehydrate again, since only a missing key rehydrates.
     *
     * @param excludeParticipantId a joiner whose document is already durable but
     *                             who has not been admitted yet, so the cap check
     *                             does not count them twice; {@code null} to seed
     *                             the roster whole
     * @return {@code true} when the key was already live and was left untouched —
     *         the one case in which a caller may safely {@link #add} a single
     *         missing member; {@code false} when the key was absent, whether or not
     *         this call seeded it
     */
    private boolean rehydrateIfMissing(String sessionId, String excludeParticipantId) {
        String key = keys.rosterKey(sessionId);
        if (Boolean.TRUE.equals(redis.hasKey(key))) {
            return true;
        }
        List<String> ids = new ArrayList<>();
        for (Participant participant : participants(sessionId)) {
            if (!participant.getParticipantId().equals(excludeParticipantId)) {
                ids.add(participant.getParticipantId());
            }
        }
        if (!ids.isEmpty()) {
            redis.opsForSet().add(key, ids.toArray(String[]::new));
            redis.expire(key, props.getRoster().getTtl());
        }
        return false;
    }
}
