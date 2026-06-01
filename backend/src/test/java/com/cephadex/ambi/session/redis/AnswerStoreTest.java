package com.cephadex.ambi.session.redis;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import org.springframework.data.redis.core.HashOperations;
import org.springframework.data.redis.core.StringRedisTemplate;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.McqAnswer;

/**
 * Round-trips {@link Answer}s through the store over a HashMap-backed mock of the
 * Redis Hash ops, using the real {@link RedisJsonCodec}, so submit / read / count
 * / clear and the polymorphic {@code AnswerPayload} serialization are exercised
 * together — including that a participant re-submitting overwrites in place.
 */
class AnswerStoreTest {

    private static final SessionId SID = new SessionId("session-1");
    private static final SlideId SLIDE = new SlideId("slide-1");

    private Map<String, Map<String, String>> store;
    private AnswerStore answerStore;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @BeforeEach
    void setUp() {
        StringRedisTemplate redis = mock(StringRedisTemplate.class);
        HashOperations<String, String, String> hashOps = mock(HashOperations.class);
        when(redis.opsForHash()).thenReturn((HashOperations) hashOps);

        store = new HashMap<>();
        doAnswer(inv -> {
            store.computeIfAbsent(inv.getArgument(0), k -> new HashMap<>())
                    .put(inv.getArgument(1), inv.getArgument(2));
            return null;
        }).when(hashOps).put(anyString(), anyString(), anyString());
        when(hashOps.get(anyString(), anyString()))
                .thenAnswer(inv -> store.getOrDefault(inv.getArgument(0), Map.of()).get(inv.getArgument(1)));
        when(hashOps.entries(anyString()))
                .thenAnswer(inv -> new HashMap<>(store.getOrDefault(inv.getArgument(0), Map.of())));
        when(hashOps.size(anyString()))
                .thenAnswer(inv -> (long) store.getOrDefault(inv.getArgument(0), Map.of()).size());
        when(redis.delete(anyString())).thenAnswer(inv -> store.remove((String) inv.getArgument(0)) != null);

        SessionRedisProperties props = new SessionRedisProperties();
        answerStore = new AnswerStore(redis, new RedisJsonCodec(), new SessionKeys(props), props);
    }

    @Test
    void answerOfReturnsEmptyWhenAbsent() {
        assertThat(answerStore.answerOf(SID, SLIDE, "p-1")).isEmpty();
        assertThat(answerStore.count(SID, SLIDE)).isZero();
    }

    @Test
    void submitThenReadRoundTripsThePolymorphicPayload() {
        answerStore.submit(SID, SLIDE, answer("p-1", new McqAnswer(Set.of("opt-a", "opt-b"))));

        Answer back = answerStore.answerOf(SID, SLIDE, "p-1").orElseThrow();
        assertThat(back.getParticipantId()).isEqualTo("p-1");
        assertThat(back.getSlideId()).isEqualTo("slide-1");
        assertThat(back.getPayload()).isInstanceOf(McqAnswer.class);
        assertThat(((McqAnswer) back.getPayload()).optionIds()).containsExactlyInAnyOrder("opt-a", "opt-b");
    }

    @Test
    void resubmitOverwritesInPlace() {
        answerStore.submit(SID, SLIDE, answer("p-1", new McqAnswer(Set.of("opt-a"))));
        answerStore.submit(SID, SLIDE, answer("p-1", new McqAnswer(Set.of("opt-b"))));

        assertThat(answerStore.count(SID, SLIDE)).isEqualTo(1);
        McqAnswer payload = (McqAnswer) answerStore.answerOf(SID, SLIDE, "p-1").orElseThrow().getPayload();
        assertThat(payload.optionIds()).containsExactly("opt-b");
    }

    @Test
    void answersReturnsEveryParticipantsSubmission() {
        answerStore.submit(SID, SLIDE, answer("p-1", new McqAnswer(Set.of("opt-a"))));
        answerStore.submit(SID, SLIDE, answer("p-2", new McqAnswer(Set.of("opt-b"))));

        assertThat(answerStore.answers(SID, SLIDE))
                .extracting(Answer::getParticipantId)
                .containsExactlyInAnyOrder("p-1", "p-2");
    }

    @Test
    void clearRemovesTheRoundsAnswers() {
        answerStore.submit(SID, SLIDE, answer("p-1", new McqAnswer(Set.of("opt-a"))));
        answerStore.clear(SID, SLIDE);
        assertThat(answerStore.count(SID, SLIDE)).isZero();
    }

    private static Answer answer(String participantId, McqAnswer payload) {
        Answer a = new Answer();
        a.setParticipantId(participantId);
        a.setSessionId(SID.value());
        a.setSlideId(SLIDE.value());
        a.setSubmittedAt(Instant.parse("2026-05-30T12:00:00Z"));
        a.setPayload(payload);
        return a;
    }
}
