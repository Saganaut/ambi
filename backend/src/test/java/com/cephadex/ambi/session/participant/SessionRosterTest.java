package com.cephadex.ambi.session.participant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.ArgumentMatchers;
import org.springframework.data.redis.core.SetOperations;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.RedisScript;

import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.session.event.EventEnvelope;
import com.cephadex.ambi.session.event.ParticipantJoined;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * The live-membership index: admitting is one atomic Redis step that enforces
 * the cap, records the member, allocates the event sequence and publishes; and
 * every read self-heals from MongoDB when the set has been evicted, so a lost
 * key costs a slower read rather than locking a participant out.
 */
class SessionRosterTest {

    private static final String SID = "sess-1";
    private static final String PUB = "pub-1";
    private static final String P1 = "p-1";
    private static final String ROSTER_KEY = "ambi:session:roster:" + SID;

    private StringRedisTemplate redis;
    private SetOperations<String, String> sets;
    private ParticipantRepository participants;
    private RedisJsonCodec codec;
    private SessionRoster roster;

    @SuppressWarnings({ "unchecked", "rawtypes" })
    @BeforeEach
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        sets = mock(SetOperations.class);
        when(redis.opsForSet()).thenReturn((SetOperations) sets);
        participants = mock(ParticipantRepository.class);
        codec = new RedisJsonCodec();
        SessionRedisProperties props = new SessionRedisProperties();
        roster = new SessionRoster(redis, participants, codec, new SessionKeys(props), props);
    }

    // ── admit ────────────────────────────────────────────────────────────────

    @Test
    void admitEnforcesTheCapAddsAndPublishesInOneScript() {
        when(redis.hasKey(ROSTER_KEY)).thenReturn(true);
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(7L);

        Participant joining = participant();
        boolean admitted = roster.admit(SID, PUB, joining.getParticipantId(), 50,
                SessionEvents.participantJoined(joining));

        assertThat(admitted).isTrue();
        ArgumentCaptor<RedisScript<Long>> script = ArgumentCaptor.captor();
        ArgumentCaptor<List<String>> keys = ArgumentCaptor.captor();
        ArgumentCaptor<Object> argv = ArgumentCaptor.captor();
        verify(redis).execute(script.capture(), keys.capture(), argv.capture(), argv.capture(), argv.capture(),
                argv.capture(), argv.capture(), argv.capture(), argv.capture());

        assertThat(keys.getValue()).containsExactly(ROSTER_KEY, "ambi:session:eventseq:" + PUB);
        // The cap check, the membership write, the sequence and the publish are one
        // server-side step — that is what removes the session lock from the join.
        assertThat(script.getValue().getScriptAsString())
                .contains("redis.call('scard', KEYS[1]) >= tonumber(ARGV[2])")
                .contains("redis.call('sadd', KEYS[1], ARGV[1])")
                .contains("redis.call('incr', KEYS[2])")
                .contains("redis.call('publish', ARGV[5], ARGV[6] .. sequence .. ARGV[7])");
        assertThat(argv.getAllValues().get(0)).isEqualTo(joining.getParticipantId());
        assertThat(argv.getAllValues().get(1)).isEqualTo("50");
        assertThat(argv.getAllValues().get(2)).isEqualTo(String.valueOf(Duration.ofHours(6).toMillis()));
        assertThat(argv.getAllValues().get(4)).isEqualTo("ambi:session:events");

        // The spliced payload is the same wire envelope RedisEventPublisher emits.
        String payload = String.valueOf(argv.getAllValues().get(5)) + 7L + argv.getAllValues().get(6);
        EventEnvelope wire = codec.deserialize(payload, EventEnvelope.class);
        assertThat(wire.publicId()).isEqualTo(PUB);
        assertThat(wire.envelope().sequence()).isEqualTo(7L);
        assertThat(wire.envelope().event()).isInstanceOfSatisfying(ParticipantJoined.class,
                joined -> assertThat(joined.participant().participantId())
                        .isEqualTo(joining.getParticipantId()));
    }

    @Test
    void admitReportsAFullSessionWhenTheScriptRefuses() {
        when(redis.hasKey(ROSTER_KEY)).thenReturn(true);
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(-1L);

        assertThat(roster.admit(SID, PUB, P1, 2, SessionEvents.participantJoined(participant()))).isFalse();
    }

    @Test
    void admitRehydratesAnEvictedSetSoTheCapCountsTheRealMembership() {
        when(redis.hasKey(ROSTER_KEY)).thenReturn(false);
        Participant host = participant();
        Participant early = participant();
        when(participants.findBySessionIdAndLeftAtIsNullOrderByJoinedAtAsc(SID)).thenReturn(List.of(host, early));
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(3L);

        roster.admit(SID, PUB, P1, 50, SessionEvents.participantJoined(participant()));

        verify(sets).add(ROSTER_KEY, host.getParticipantId(), early.getParticipantId());
        verify(redis).expire(ROSTER_KEY, Duration.ofHours(6));
    }

    // ── contains ─────────────────────────────────────────────────────────────

    @Test
    void containsIsASetMembershipCheck() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(true);

        assertThat(roster.contains(SID, P1)).isTrue();
        verify(participants, never()).existsByParticipantIdAndSessionIdAndLeftAtIsNull(anyString(), anyString());
    }

    @Test
    void containsFallsBackToMongoAndHealsTheSetOnAMiss() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(false);
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNull(P1, SID)).thenReturn(true);

        assertThat(roster.contains(SID, P1)).isTrue();
        verify(sets).add(ROSTER_KEY, P1);
    }

    @Test
    void containsIsFalseForSomeoneWhoLeft() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(false);
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNull(P1, SID)).thenReturn(false);

        assertThat(roster.contains(SID, P1)).isFalse();
        verify(sets, never()).add(eq(ROSTER_KEY), any(String[].class));
    }

    // ── membership listing ───────────────────────────────────────────────────

    @Test
    void participantsComeBackInJoinOrderFromTheDurableRecord() {
        Participant first = participant();
        Participant second = participant();
        when(participants.findBySessionIdAndLeftAtIsNullOrderByJoinedAtAsc(SID)).thenReturn(List.of(first, second));

        assertThat(roster.participants(SID)).containsExactly(first, second);
    }

    /** A real participant on the session — the event builders read its whole profile. */
    private static Participant participant() {
        Participant p = Participant.join("user-1", "Player One", null, null);
        p.joinSession(SID);
        return p;
    }
}
