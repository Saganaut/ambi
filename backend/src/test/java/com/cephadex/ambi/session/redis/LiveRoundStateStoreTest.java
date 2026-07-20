package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * Round-trips {@link LiveRoundState} through the store over a HashMap-backed
 * mock
 * template, using the real {@link RedisJsonCodec}, so the serialize/store/load
 * and clear paths are exercised together.
 */
class LiveRoundStateStoreTest {

    private static final String SID = new String("session-1");

    private Map<String, String> store;
    private LiveRoundStateStore roundStateStore;

    @SuppressWarnings("unchecked")
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(valueOps);

        store = new HashMap<>();
        when(valueOps.get(anyString())).thenAnswer(inv -> store.get((String) inv.getArgument(0)));
        org.mockito.Mockito.doAnswer(inv -> {
            store.put(inv.getArgument(0), inv.getArgument(1));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
        when(redis.delete(anyString())).thenAnswer(inv -> store.remove((String) inv.getArgument(0)) != null);

        SessionRedisProperties props = new SessionRedisProperties();
        roundStateStore = new LiveRoundStateStore(redis, new RedisJsonCodec(), new SessionKeys(props), props);
    }

    @Test
    void loadReturnsEmptyWhenAbsent() {
        assertThat(roundStateStore.load(SID)).isEmpty();
    }

    @Test
    void saveThenLoadRoundTrips() {
        LiveRoundState state = new LiveRoundState(
                "public-1", RoundPhase.SUBMIT, "slide-1", Instant.parse("2026-05-30T12:00:00Z"), null, null, 0L);

        roundStateStore.save(SID, state);

        assertThat(roundStateStore.load(SID)).contains(state);
    }

    @Test
    void clearRemovesState() {
        roundStateStore.save(SID, LiveRoundState.idle());
        roundStateStore.clear(SID);
        assertThat(roundStateStore.load(SID)).isEqualTo(Optional.empty());
    }
}
