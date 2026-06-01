package com.cephadex.ambi.session.redis;

import org.springframework.stereotype.Component;

import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;

/**
 * Builds the namespaced Redis keys for a session, keeping the
 * {@code namespace + ":" + id} convention (mirroring
 * {@code RedisTokenSessionService}'s private {@code key()} helper) in exactly one
 * place so the lock and the state store can't drift apart on key shape.
 */
@Component
public class SessionKeys {

    private final SessionRedisProperties props;

    public SessionKeys(SessionRedisProperties props) {
        this.props = props;
    }

    /** Key for the per-session lock. */
    public String lockKey(SessionId sid) {
        return props.getLock().getNamespace() + ":" + sid.value();
    }

    /** Key for the in-flight round-state snapshot. */
    public String stateKey(SessionId sid) {
        return props.getState().getNamespace() + ":" + sid.value();
    }

    /**
     * Key for a round's option-tally hash. Keyed by {@code sid + slideId} (a round
     * is identified by that pair, mirroring {@code RoundResultId}) so a stale
     * round's tallies can't bleed into the next round on the same session.
     */
    public String tallyKey(SessionId sid, SlideId slideId) {
        return props.getTally().getNamespace() + ":" + sid.value() + ":" + slideId.value();
    }

    /**
     * Key for a round's in-flight answers hash. Keyed by {@code sid + slideId}
     * (the same round identity as {@link #tallyKey}) so a stale round's answers
     * can't bleed into the next round on the same session.
     */
    public String answersKey(SessionId sid, SlideId slideId) {
        return props.getAnswers().getNamespace() + ":" + sid.value() + ":" + slideId.value();
    }

    /** Key for a session's live participant-presence hash (one entry per participant). */
    public String presenceKey(SessionId sid) {
        return props.getPresence().getNamespace() + ":" + sid.value();
    }
}
