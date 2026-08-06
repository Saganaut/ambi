package com.cephadex.ambi.session.participant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
                // The cap counts the seats other members hold: a pre-seeded joiner is
                // discounted from the cardinality, never waved past the check.
                .contains("local held = redis.call('sismember', KEYS[1], ARGV[1])")
                .contains("redis.call('scard', KEYS[1]) - held >= tonumber(ARGV[2])")
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
        Participant host = admittedMember();
        Participant early = admittedMember();
        when(participants.findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(SID))
                .thenReturn(List.of(host, early));
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(3L);

        roster.admit(SID, PUB, P1, 50, SessionEvents.participantJoined(participant()));

        verify(sets).add(ROSTER_KEY, host.getParticipantId(), early.getParticipantId());
        verify(redis).expire(ROSTER_KEY, Duration.ofHours(6));
    }

    @Test
    void admitLeavesTheJoinerOutOfTheRehydrateSoTheLastSeatIsStillFree() {
        when(redis.hasKey(ROSTER_KEY)).thenReturn(false);
        Participant host = admittedMember();
        Participant joining = participant();
        // Belt-and-braces: the durable seed is admitted-only, so a joiner mid-flight
        // is normally invisible to it — this pins the exclusion for the case where a
        // stale read hands one back anyway.
        when(participants.findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(SID))
                .thenReturn(List.of(host, joining));
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(3L);

        assertThat(roster.admit(SID, PUB, joining.getParticipantId(), 2,
                SessionEvents.participantJoined(joining))).isTrue();

        // Seeding the joiner would have the script count them before it adds them,
        // making the effective cap one seat short on every rehydrate.
        verify(sets).add(ROSTER_KEY, host.getParticipantId());
    }

    @Test
    void admitFailsLoudlyWhenTheScriptReturnsNoReply() {
        when(redis.hasKey(ROSTER_KEY)).thenReturn(true);
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), anyList(),
                any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(null);

        // A missing reply is a Redis failure, not a full session — reporting it as
        // "full" would surface infrastructure trouble as a 409 SESSION_FULL.
        assertThatThrownBy(() -> roster.admit(SID, PUB, P1, 2, SessionEvents.participantJoined(participant())))
                .isInstanceOf(IllegalStateException.class);
    }

    // ── contains ─────────────────────────────────────────────────────────────

    @Test
    void containsIsASetMembershipCheck() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(true);

        assertThat(roster.contains(SID, P1)).isTrue();
        verify(participants, never())
                .existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(anyString(), anyString());
    }

    @Test
    void containsFallsBackToMongoAndRehydratesTheWholeSetOnAMiss() {
        Participant host = admittedMember();
        Participant asking = admittedMember();
        when(sets.isMember(ROSTER_KEY, asking.getParticipantId())).thenReturn(false);
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(
                asking.getParticipantId(), SID)).thenReturn(true);
        when(redis.hasKey(ROSTER_KEY)).thenReturn(false);
        when(participants.findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(SID))
                .thenReturn(List.of(host, asking));

        assertThat(roster.contains(SID, asking.getParticipantId())).isTrue();

        // The whole durable roster is seeded. Healing the asking member alone would
        // re-create the key with one id, and rehydrateIfMissing only seeds an absent
        // key — so every later admit would check its cap against a set missing
        // everyone who never called contains.
        verify(sets).add(ROSTER_KEY, host.getParticipantId(), asking.getParticipantId());
        // The seed already carries the asking member, so no second SADD follows it.
        verify(sets, never()).add(ROSTER_KEY, asking.getParticipantId());
    }

    @Test
    void containsLeavesTheKeyAbsentWhenTheRehydrateFoundNobody() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(false);
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(P1, SID))
                .thenReturn(true);
        when(redis.hasKey(ROSTER_KEY)).thenReturn(false);
        // The durable roster came back empty — the member was removed between the two
        // reads (a join rollback racing this heal).
        when(participants.findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(SID))
                .thenReturn(List.of());

        assertThat(roster.contains(SID, P1)).isTrue();

        // Re-creating the key with the one id asked about would leave a set that
        // undercounts the roster forever: only an absent key rehydrates, so nothing
        // could ever repair it and every later admit would check its cap against it.
        verify(sets, never()).add(eq(ROSTER_KEY), any(String[].class));
        verify(redis, never()).expire(eq(ROSTER_KEY), any());
    }

    @Test
    void containsHealsTheAskingMemberWhenTheKeyIsStillThere() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(false);
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(P1, SID))
                .thenReturn(true);
        when(redis.hasKey(ROSTER_KEY)).thenReturn(true);

        assertThat(roster.contains(SID, P1)).isTrue();
        // A live key can't be rebuilt wholesale (Redis can't say what it is missing),
        // so the member that was asked for is put back on its own.
        verify(sets).add(ROSTER_KEY, P1);
        verify(participants, never())
                .findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(anyString());
    }

    @Test
    void containsIsFalseForSomeoneWhoLeftOrWasNeverAdmitted() {
        when(sets.isMember(ROSTER_KEY, P1)).thenReturn(false);
        // The one query answers both: a departure stamps left_at, and a join still in
        // flight has yet to stamp admitted_at.
        when(participants.existsByParticipantIdAndSessionIdAndLeftAtIsNullAndAdmittedAtNotNull(P1, SID))
                .thenReturn(false);

        assertThat(roster.contains(SID, P1)).isFalse();
        verify(sets, never()).add(eq(ROSTER_KEY), any(String[].class));
    }

    // ── membership listing ───────────────────────────────────────────────────

    @Test
    void participantsComeBackInJoinOrderFromTheDurableRecord() {
        Participant first = admittedMember();
        Participant second = admittedMember();
        when(participants.findBySessionIdAndLeftAtIsNullAndAdmittedAtNotNullOrderByJoinedAtAsc(SID))
                .thenReturn(List.of(first, second));

        assertThat(roster.participants(SID)).containsExactly(first, second);
    }

    /** A real participant on the session — the event builders read its whole profile. */
    private static Participant participant() {
        Participant p = Participant.join("user-1", "Player One", null, null);
        p.joinSession(SID);
        return p;
    }

    /**
     * A participant the roster has already admitted — what the durable membership
     * queries hand back, as opposed to a joiner still mid-flight.
     */
    private static Participant admittedMember() {
        Participant p = participant();
        p.markAdmitted();
        return p;
    }
}
