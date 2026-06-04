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
    public String stateKey(String sessionId) {
        return props.getState().getNamespace() + ":" + sessionId;
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
     * Key for a session's live participant-presence hash (one entry per
     * participant).
     */
    public String presenceKey(String sessionId) {
        return props.getPresence().getNamespace() + ":" + sessionId;
    }
}
