package com.cephadex.ambi.session.redis;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.session.redis.SessionLocks.SessionLock;

/**
 * Backs the mocked {@link StringRedisTemplate} with a tiny in-memory KV (the
 * same
 * style as {@code RedisTokenSessionServiceTest}) so the full SET-NX / Lua
 * compare-and-delete protocol is exercised: acquire is exclusive, release frees
 * the lock, release only removes our own token, and {@code withLock} always
 * releases — even when the work throws.
 */
class SessionLocksTest {

    private static final String SID = new String("session-1");

    private Map<String, String> store;
    private SessionLocks locks;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);

        store = new HashMap<>();

        // SET key token NX PX lease — succeed only if the key is free.
        when(valueOps.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenAnswer(inv -> {
            String key = inv.getArgument(0);
            if (store.containsKey(key)) {
                return false;
            }
            store.put(key, inv.getArgument(1));
            return true;
        });

        // Lua compare-and-delete: delete only if the stored value is our token.
        when(redis.execute(any(RedisScript.class), anyList(), any())).thenAnswer(inv -> {
            String key = ((List<String>) inv.getArgument(1)).get(0);
            String token = inv.getArgument(2);
            if (token.equals(store.get(key))) {
                store.remove(key);
                return 1L;
            }
            return 0L;
        });

        SessionRedisProperties props = new SessionRedisProperties();
        locks = new SessionLocks(redis, new SessionKeys(props), props);
    }

    @Test
    void acquireIsExclusiveThenReleaseFreesIt() {
        SessionLock first = locks.tryAcquire(SID);
        assertThatThrownBy(() -> locks.tryAcquire(SID))
                .isInstanceOf(ConflictException.class)
                .satisfies(e -> assertThat(((ConflictException) e).getCode()).isEqualTo("SESSION_LOCKED"));

        first.close();
        // Freed — re-acquirable.
        locks.tryAcquire(SID).close();
    }

    @Test
    void releaseOnlyDeletesOurOwnToken() {
        SessionLock held = locks.tryAcquire(SID);

        // Simulate the lease expiring and another holder taking over the key.
        store.put(onlyKey(), "someone-elses-token");

        held.close();
        // Our release must not have clobbered the new owner's lock.
        assertThat(store.get(onlyKey())).isEqualTo("someone-elses-token");
    }

    @Test
    void withLockReleasesEvenWhenWorkThrows() {
        assertThatThrownBy(() -> locks.withLock(SID, () -> {
            throw new IllegalStateException("boom");
        })).isInstanceOf(IllegalStateException.class);

        // Lock was released in the finally — the session is free again.
        assertThat(store).isEmpty();
        locks.tryAcquire(SID).close();
    }

    private String onlyKey() {
        return store.keySet().iterator().next();
    }
}
