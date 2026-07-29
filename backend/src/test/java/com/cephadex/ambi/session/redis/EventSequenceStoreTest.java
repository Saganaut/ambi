package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

/**
 * Covers the read side of the per-session event counter: the namespaced key it
 * reads (keyed by publicId, matching the publisher's allocation) and the
 * absent-key-means-zero semantic the snapshot relies on.
 */
class EventSequenceStoreTest {

    private ValueOperations<String, String> values;
    private EventSequenceStore store;

    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        values = mock();
        when(redis.opsForValue()).thenReturn(values);
        store = new EventSequenceStore(redis, new SessionKeys(new SessionRedisProperties()));
    }

    @Test
    void readsTheSessionsCounterFromItsNamespacedKey() {
        when(values.get("ambi:session:eventseq:pub-1")).thenReturn("12");

        assertThat(store.lastSequence("pub-1")).isEqualTo(12L);
    }

    @Test
    void absentCounterKeyReadsAsZero() {
        when(values.get("ambi:session:eventseq:pub-1")).thenReturn(null);

        assertThat(store.lastSequence("pub-1")).isZero();
    }
}
