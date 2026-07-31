package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import java.time.Duration;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;

/**
 * Round-trips a candidate set through the store over a HashMap-backed mock of
 * the Redis value ops, using the real {@link RedisJsonCodec}, so the JSON write
 * (key + TTL), the order-preserving read back, the absent-key default and clear
 * are exercised together. Also the lenient read: a legacy blob written before
 * {@code authoredAnswer} existed must still load, as an unseeded board.
 */
class FollowUpOptionStoreTest {

    private static final String SID = new String("session-1");
    private static final String SLIDE = new String("slide-1");
    private static final String KEY = "ambi:session:followup:session-1:slide-1";

    private Map<String, String> store;
    private Map<String, Duration> expiries;
    private FollowUpOptionStore optionStore;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        ValueOperations<String, String> valueOps = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn((ValueOperations) valueOps);

        store = new HashMap<>();
        expiries = new HashMap<>();
        doAnswer(inv -> {
            store.put(inv.getArgument(0), inv.getArgument(1));
            expiries.put(inv.getArgument(0), inv.getArgument(2));
            return null;
        }).when(valueOps).set(anyString(), anyString(), any(Duration.class));
        when(valueOps.get(anyString())).thenAnswer(inv -> store.get((String) inv.getArgument(0)));
        when(redis.delete(anyString())).thenAnswer(inv -> store.remove((String) inv.getArgument(0)) != null);

        SessionRedisProperties props = new SessionRedisProperties();
        optionStore = new FollowUpOptionStore(redis, new RedisJsonCodec(), new SessionKeys(props), props);
    }

    @Test
    void loadReturnsEmptyWhenTheRoundNeverMinted() {
        assertThat(optionStore.load(SID, SLIDE).options()).isEmpty();
    }

    @Test
    void saveWritesOneJsonValueUnderTheRoundKeyWithTheConfiguredTtl() {
        optionStore.save(SID, SLIDE, new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-1", "Alpha", null, Set.of("p-1"), false))));

        assertThat(store).containsOnlyKeys(KEY);
        assertThat(store.get(KEY)).contains("\"optionId\":\"opt-1\"");
        assertThat(expiries.get(KEY)).isEqualTo(new SessionRedisProperties().getFollowUp().getTtl());
    }

    @Test
    void loadRoundTripsBoardOrderAndAuthorSets() {
        optionStore.save(SID, SLIDE, new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-1", "Alpha", null, Set.of("p-1", "p-2"), false),
                new FollowUpOption("opt-2", null, "https://cdn/two.png", Set.of("p-3"), false))));

        List<FollowUpOption> back = optionStore.load(SID, SLIDE).options();

        assertThat(back).extracting(option -> option.optionId()).containsExactly("opt-1", "opt-2");
        assertThat(back.get(0).text()).isEqualTo("Alpha");
        assertThat(back.get(0).imageUrl()).isNull();
        assertThat(back.get(0).authorParticipantIds()).containsExactlyInAnyOrder("p-1", "p-2");
        assertThat(back.get(1).imageUrl()).isEqualTo("https://cdn/two.png");
        assertThat(back.get(1).text()).isNull();
    }

    @Test
    void saveReplacesTheEarlierMintRatherThanMergingIt() {
        optionStore.save(SID, SLIDE, new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-1", "Alpha", null, Set.of("p-1"), false))));
        optionStore.save(SID, SLIDE, new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-2", "Beta", null, Set.of("p-2"), false))));

        assertThat(optionStore.load(SID, SLIDE).options())
                .extracting(option -> option.optionId()).containsExactly("opt-2");
    }

    @Test
    void loadReadsABlobWrittenBeforeAuthoredAnswerExistedAsUnseeded() {
        // Written straight into Redis rather than through save(): this is the
        // pre-deploy shape, with no authoredAnswer field at all. A strict read
        // would reject the absent primitive and take the round's board down with
        // it — false is exactly what "nothing was seeded into this board" means,
        // which is the truth for every set minted before the flag.
        store.put(KEY, """
                {"options":[{"optionId":"opt-1","text":"Alpha","imageUrl":null,\
                "authorParticipantIds":["p-1"]}]}""");

        List<FollowUpOption> back = optionStore.load(SID, SLIDE).options();

        assertThat(back).singleElement().satisfies(option -> {
            assertThat(option.optionId()).isEqualTo("opt-1");
            assertThat(option.text()).isEqualTo("Alpha");
            assertThat(option.authorParticipantIds()).containsExactly("p-1");
            assertThat(option.authoredAnswer()).isFalse();
        });
    }

    @Test
    void clearRemovesTheRoundsCandidates() {
        optionStore.save(SID, SLIDE, new FollowUpOptionSet(List.of(
                new FollowUpOption("opt-1", "Alpha", null, Set.of("p-1"), false))));

        optionStore.clear(SID, SLIDE);

        assertThat(store).isEmpty();
        assertThat(optionStore.load(SID, SLIDE).options()).isEmpty();
    }
}
