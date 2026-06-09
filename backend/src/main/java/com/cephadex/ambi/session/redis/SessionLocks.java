package com.cephadex.ambi.session.redis;

import java.util.List;
import java.util.UUID;
import java.util.function.Supplier;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.exception.ConflictException;

/**
 * Per-session mutual exclusion over Redis, so two operations on the same live
 * session (a double-clicked {@code startRound}, a late answer racing the host's
 * reveal, two app instances acting on the same room) can't interleave and
 * corrupt the in-flight state.
 *
 * <p>
 * <strong>Protocol.</strong> Acquire is {@code SET key token NX PX lease} via
 * {@link org.springframework.data.redis.core.ValueOperations#setIfAbsent}: it
 * succeeds only if no one holds the key, and the value is a per-acquisition
 * random token. Release is a Lua compare-and-delete that removes the key only
 * when it still holds <em>our</em> token, so a holder whose lease already
 * expired
 * (and was re-acquired by someone else) can never delete the new owner's lock.
 * The {@code lease} TTL (see {@link SessionRedisProperties.Lock#getLease()}) is
 * the deadlock backstop: a crashed holder's lock self-expires.
 *
 * <p>
 * <strong>Fail-fast.</strong> {@link #tryAcquire} does not wait — if the
 * session is already locked it throws {@link ConflictException} with code
 * {@code SESSION_LOCKED} (HTTP 409). Callers that want all-or-nothing semantics
 * should use {@link #withLock}.
 *
 * <p>
 * <strong>Not reentrant.</strong> A thread already holding a session's lock
 * that calls {@link #tryAcquire} again for the same session will be rejected.
 * Don't nest locked sections for the same session.
 */
@Component
public class SessionLocks {

    private static final Logger log = LoggerFactory.getLogger(SessionLocks.class);

    /**
     * Atomic compare-and-delete: delete the key only if it still holds our token.
     * Returns 1 if we released our own lock, 0 if it was already gone or taken
     * over by another holder.
     */
    private static final RedisScript<Long> RELEASE = new DefaultRedisScript<>(
            "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end",
            Long.class);

    private final StringRedisTemplate redis;
    private final SessionKeys keys;
    private final SessionRedisProperties props;

    public SessionLocks(StringRedisTemplate redis, SessionKeys keys, SessionRedisProperties props) {
        this.redis = redis;
        this.keys = keys;
        this.props = props;
    }

    /**
     * Tries to take the session's lock without waiting. On success returns a
     * handle that releases the lock when {@linkplain SessionLock#close() closed}
     * (use try-with-resources); on contention throws {@link ConflictException}.
     */
    public SessionLock tryAcquire(String sid) {
        String key = keys.lockKey(sid);
        String token = UUID.randomUUID().toString();
        Boolean acquired = redis.opsForValue().setIfAbsent(key, token, props.getLock().getLease());
        if (!Boolean.TRUE.equals(acquired)) {
            throw new ConflictException("SESSION_LOCKED",
                    "This session is busy with another operation. Please try again.");
        }
        return new SessionLock(key, token);
    }

    /**
     * Runs {@code work} while holding the session's lock, releasing it in a
     * {@code finally} (including when {@code work} throws). Throws
     * {@link ConflictException} if the lock can't be taken.
     */
    @SuppressWarnings("try") // the lock is held for its close-on-exit side effect; the resource is intentionally unused in the body
    public <T> T withLock(String sid, Supplier<T> work) {
        try (SessionLock ignored = tryAcquire(sid)) {
            return work.get();
        }
    }

    /** {@link Runnable} overload of {@link #withLock(SessionId, Supplier)}. */
    public void withLock(String sid, Runnable work) {
        withLock(sid, () -> {
            work.run();
            return null;
        });
    }

    /**
     * A held session lock. {@link #close()} runs the compare-and-delete release
     * script; it's idempotent and safe to call after the lease has already
     * expired (the script simply finds nothing of ours to delete).
     */
    public final class SessionLock implements AutoCloseable {

        private final String key;
        private final String token;
        private boolean released;

        private SessionLock(String key, String token) {
            this.key = key;
            this.token = token;
        }

        @Override
        public void close() {
            if (released) {
                return;
            }
            released = true;
            Long deleted = redis.execute(RELEASE, List.of(key), token);
            if (!Long.valueOf(1L).equals(deleted)) {
                // The lease expired (or was forcibly cleared) before we released:
                // the work outran its lease window. Worth a warning — it means a
                // concurrent op may have run against the same session.
                log.warn("Session lock {} was no longer held at release — lease may be too short", key);
            }
        }
    }
}
