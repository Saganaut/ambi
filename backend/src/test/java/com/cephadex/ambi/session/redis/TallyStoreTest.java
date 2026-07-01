package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.HashMap;
import java.util.Map;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

/**
 * Exercises increment / decrement / tally over a HashMap-backed mock of the Redis
 * Hash ops, so the {@code HINCRBY} arithmetic and the read-back path are verified
 * together — including that a decrement backs out exactly one prior increment.
 */
class TallyStoreTest {

    private static final String SID = "session-1";
    private static final String SLIDE = "slide-1";

    private Map<String, Map<String, Long>> store;
    private TallyStore tallyStore;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        HashOperations<String, String, String> hashOps = mock(HashOperations.class);
        when(redis.opsForHash()).thenReturn((HashOperations) hashOps);

        store = new HashMap<>();
        when(hashOps.increment(anyString(), anyString(), anyLong())).thenAnswer(inv -> {
            Map<String, Long> counts = store.computeIfAbsent(inv.getArgument(0), _ -> new HashMap<>());
            long next = counts.getOrDefault(inv.getArgument(1), 0L) + (long) inv.getArgument(2);
            counts.put(inv.getArgument(1), next);
            return next;
        });
        when(hashOps.entries(anyString())).thenAnswer(inv -> {
            Map<String, Long> counts = store.getOrDefault(inv.getArgument(0), Map.of());
            Map<String, String> raw = new HashMap<>();
            counts.forEach((k, v) -> raw.put(k, String.valueOf(v)));
            return raw;
        });

        SessionRedisProperties props = new SessionRedisProperties();
        tallyStore = new TallyStore(redis, new SessionKeys(props), props);
    }

    @Test
    void incrementAccumulatesPerOption() {
        tallyStore.increment(SID, SLIDE, "opt-a");
        tallyStore.increment(SID, SLIDE, "opt-a");
        tallyStore.increment(SID, SLIDE, "opt-b");

        assertThat(tallyStore.tally(SID, SLIDE))
                .containsExactlyInAnyOrderEntriesOf(Map.of("opt-a", 2, "opt-b", 1));
    }

    @Test
    void decrementBacksOutAPriorIncrement() {
        tallyStore.increment(SID, SLIDE, "opt-a");
        tallyStore.increment(SID, SLIDE, "opt-a");

        long after = tallyStore.decrement(SID, SLIDE, "opt-a");

        assertThat(after).isEqualTo(1L);
        assertThat(tallyStore.tally(SID, SLIDE)).containsEntry("opt-a", 1);
    }
}
