package com.cephadex.ambi.session.redis;

import org.springframework.stereotype.Component;

/**
 * Builds the namespaced Redis keys for a session, keeping the
 * {@code namespace + ":" + id} convention (mirroring
 * {@code RedisTokenSessionService}'s private {@code key()} helper) in exactly
 * one
 * place so the lock and the state store can't drift apart on key shape.
 */
@Component
public class SessionKeys {

    private final SessionRedisProperties props;

    public SessionKeys(SessionRedisProperties props) {
        this.props = props;
    }

    /** Key for the per-session lock. */
    public String lockKey(String sessionId) {
        return props.getLock().getNamespace() + ":" + sessionId;
    }

    /** Key for the in-flight round-state snapshot. */
    public String roundStateKey(String sessionId) {
        return props.getRoundState().getNamespace() + ":" + sessionId;
    }

    /**
     * Key for a round's option-tally hash. Keyed by {@code sessionId + slideId} (a
     * round
     * is identified by that pair, mirroring {@code RoundResultId}) so a stale
     * round's tallies can't bleed into the next round on the same session.
     */
    public String tallyKey(String sessionId, String slideId) {
        return props.getTally().getNamespace() + ":" + sessionId + ":" + slideId;
    }

    /**
     * Key for a round's in-flight answers hash. Keyed by
     * {@code sessionId + slideId}
     * (the same round identity as {@link #tallyKey}) so a stale round's answers
     * can't bleed into the next round on the same session.
     */
    public String answersKey(String sessionId, String slideId) {
        return props.getAnswers().getNamespace() + ":" + sessionId + ":" + slideId;
    }

    /**
     * Key for a voting round's cast-votes hash (one field per voter). Keyed by
     * {@code sessionId + slideId}, the same round identity as {@link #answersKey}.
     */
    public String votesKey(String sessionId, String slideId) {
        return props.getVotes().getNamespace() + ":" + sessionId + ":" + slideId;
    }

    /**
     * Key for a voting round's minted vote-options hash (one field per opaque
     * option id, valued with the {@link VoteOption} the id stands for). Same round
     * identity as {@link #votesKey}, suffixed so the two hashes can't collide.
     */
    public String voteOptionsKey(String sessionId, String slideId) {
        return props.getVotes().getNamespace() + ":" + sessionId + ":" + slideId + ":options";
    }

    /**
     * Key for a follow-up round's minted candidate set — a single JSON value, not
     * a hash, because the board's order is part of the payload (see
     * {@link FollowUpOptionStore}). Same round identity as {@link #answersKey},
     * addressed by the <strong>follow-up's</strong> slide id, not its parent's.
     */
    public String followUpOptionsKey(String sessionId, String slideId) {
        return props.getFollowUp().getNamespace() + ":" + sessionId + ":" + slideId;
    }

    /**
     * Key for a Q&amp;A round's host-answer hash (one field per question id).
     * Keyed by {@code sessionId + slideId}, the same round identity as
     * {@link #answersKey}.
     */
    public String qandaHostAnswersKey(String sessionId, String slideId) {
        return props.getQandaHostAnswers().getNamespace() + ":" + sessionId + ":" + slideId;
    }

    /**
     * Key for a session's live participant-presence hash (one entry per
     * participant).
     */
    public String presenceKey(String sessionId) {
        return props.getPresence().getNamespace() + ":" + sessionId;
    }

    /**
     * Key for a session's monotonic event counter. Unlike the other keys here it is
     * addressed by the session's <strong>publicId</strong>, not its internal id:
     * that is the id events are published and routed under
     * ({@code EventPublisher.publish}), so keying the counter the same way keeps the
     * publisher's allocation and the snapshot's read on one key.
     */
    public String eventSequenceKey(String publicId) {
        return props.getEventSequence().getNamespace() + ":" + publicId;
    }

    /**
     * Key of the single global deadline ZSET (ADR 002). Unlike the other keys it
     * is not per-session: the scheduler leader polls one sorted set whose members
     * ({@link SessionDeadline}) carry the session identity themselves.
     */
    public String deadlinesKey() {
        return props.getDeadlines().getKey();
    }

    /** Key of the deadline-scheduler leader lease. */
    public String deadlineLeaderKey() {
        return props.getDeadlines().getLeaderKey();
    }
}
