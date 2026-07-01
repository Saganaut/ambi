package com.cephadex.ambi.session.redis;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;

/**
 * Round-trips {@link Presence} through the store over a HashMap-backed mock of
 * the Redis Hash ops, using the real {@link RedisJsonCodec}, so save / find /
 * all / remove / clear are exercised and a per-participant remove leaves the
 * rest
 * of the roster's presence intact.
 */
class PresenceStoreTest {

    private static final String SID = new String("session-1");
    private static final String P1 = new String("p-1");
    private static final String P2 = new String("p-2");

    private Map<String, Map<String, String>> store;
    private PresenceStore presenceStore;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        HashOperations<String, String, String> hashOps = mock(HashOperations.class);
        when(redis.opsForHash()).thenReturn((HashOperations) hashOps);

        store = new HashMap<>();
        doAnswer(inv -> {
            store.computeIfAbsent(inv.getArgument(0), _ -> new HashMap<>())
                    .put(inv.getArgument(1), inv.getArgument(2));
            return null;
        }).when(hashOps).put(anyString(), anyString(), anyString());
        when(hashOps.get(anyString(), anyString()))
                .thenAnswer(inv -> store.getOrDefault(inv.getArgument(0), Map.of()).get(inv.getArgument(1)));
        when(hashOps.entries(anyString()))
                .thenAnswer(inv -> new HashMap<>(store.getOrDefault(inv.getArgument(0), Map.of())));
        when(hashOps.delete(anyString(), any())).thenAnswer(inv -> {
            Map<String, String> fields = store.get((String) inv.getArgument(0));
            return fields != null && fields.remove((String) inv.getArgument(1)) != null ? 1L : 0L;
        });
        when(redis.delete(anyString())).thenAnswer(inv -> store.remove((String) inv.getArgument(0)) != null);

        SessionRedisProperties props = new SessionRedisProperties();
        presenceStore = new PresenceStore(redis, new RedisJsonCodec(), new SessionKeys(props), props);
    }

    @Test
    void findReturnsEmptyWhenAbsent() {
        assertThat(presenceStore.find(SID, P1)).isEmpty();
        assertThat(presenceStore.all(SID)).isEmpty();
    }

    @Test
    void saveThenFindRoundTrips() {
        Presence online = Presence.online(Instant.parse("2026-05-30T12:00:00Z"));
        presenceStore.save(SID, P1, online);

        assertThat(presenceStore.find(SID, P1)).contains(online);
    }

    @Test
    void saveOverwritesTheParticipantsPresence() {
        presenceStore.save(SID, P1, Presence.online(Instant.parse("2026-05-30T12:00:00Z")));
        Presence dropped = new Presence(ConnectionStatus.DISCONNECTED, Instant.parse("2026-05-30T12:05:00Z"));
        presenceStore.save(SID, P1, dropped);

        assertThat(presenceStore.find(SID, P1)).contains(dropped);
        assertThat(presenceStore.all(SID)).hasSize(1);
    }

    @Test
    void allReturnsEveryParticipantsPresence() {
        presenceStore.save(SID, P1, Presence.online(Instant.parse("2026-05-30T12:00:00Z")));
        presenceStore.save(SID, P2,
                new Presence(ConnectionStatus.IDLE, Instant.parse("2026-05-30T12:01:00Z")));

        assertThat(presenceStore.all(SID)).containsOnlyKeys(P1, P2);
    }

    @Test
    void removeDropsOnlyThatParticipant() {
        presenceStore.save(SID, P1, Presence.online(Instant.parse("2026-05-30T12:00:00Z")));
        presenceStore.save(SID, P2, Presence.online(Instant.parse("2026-05-30T12:00:00Z")));

        presenceStore.remove(SID, P1);

        assertThat(presenceStore.find(SID, P1)).isEmpty();
        assertThat(presenceStore.all(SID)).containsOnlyKeys(P2);
    }

    @Test
    void clearRemovesAllPresence() {
        presenceStore.save(SID, P1, Presence.online(Instant.parse("2026-05-30T12:00:00Z")));
        presenceStore.clear(SID);
        assertThat(presenceStore.all(SID)).isEmpty();
    }
}
