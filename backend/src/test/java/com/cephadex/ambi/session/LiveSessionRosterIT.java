package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.doAnswer;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.CyclicBarrier;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.config.AmbiApplication;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.SessionRoster;
import com.cephadex.ambi.session.redis.SessionKeys;

/**
 * Exercises the roster against the real Docker Mongo + Redis the test profile
 * points at — the properties this change exists for can only be shown with both:
 * concurrent joins all succeed (they used to lose the fail-fast session lock and
 * 409 with {@code SESSION_LOCKED}), the participant cap still holds exactly under
 * that concurrency <em>and</em> across a rehydrate from either entry point —
 * including when a cold key makes every joiner in a burst rehydrate — an evicted
 * Redis set rehydrates instead of failing the request, a refused join strands
 * nothing in the set, and join order survives into the roster listing.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class LiveSessionRosterIT {

    @Autowired
    private LiveSessionOrchestrator orchestrator;

    /**
     * Spied only so {@link #aColdKeyJoinBurstFillsTheCapExactly} can hold the burst
     * at a barrier; every other test here runs the real roster untouched.
     */
    @MockitoSpyBean
    private SessionRoster roster;

    @Autowired
    private MongoTemplate mongoTemplate;

    @Autowired
    private StringRedisTemplate redis;

    @Autowired
    private SessionKeys keys;

    private final List<String> sessionIds = new ArrayList<>();

    @BeforeEach
    @AfterEach
    void clean() {
        for (String sessionId : sessionIds) {
            mongoTemplate.remove(new Query(Criteria.where("session_id").is(sessionId)), Participant.class);
            mongoTemplate.remove(new Query(Criteria.where("_id").is(sessionId)), LiveSession.class);
            redis.delete(keys.rosterKey(sessionId));
            redis.delete(keys.presenceKey(sessionId));
            redis.delete(keys.roundStateKey(sessionId));
        }
        sessionIds.clear();
    }

    @Test
    void concurrentJoinsAllSucceed() throws Exception {
        LiveSession session = openSession(50);
        int joiners = 12;

        List<Future<Participant>> joins = runConcurrently(joiners,
                index -> orchestrator.join(session.getRoomCode(), "user-" + index, "Player " + index, null, null)
                        .participant());

        for (Future<Participant> join : joins) {
            assertThat(join.get(30, TimeUnit.SECONDS)).isNotNull();
        }
        // Host + every joiner: nothing was lost to a race, and nothing 409'd.
        assertThat(roster.participants(session.getId())).hasSize(joiners + 1);
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo(joiners + 1L);
    }

    @Test
    void theParticipantCapHoldsExactlyUnderConcurrentJoins() throws Exception {
        int cap = 5;
        LiveSession session = openSession(cap);

        AtomicInteger full = new AtomicInteger();
        List<Future<Participant>> joins = runConcurrently(12, index -> {
            try {
                return orchestrator.join(session.getRoomCode(), "user-" + index, "Player " + index, null, null)
                        .participant();
            } catch (ConflictException rejected) {
                assertThat(rejected.getCode()).isEqualTo("SESSION_FULL");
                full.incrementAndGet();
                return null;
            }
        });

        int admitted = 0;
        for (Future<Participant> join : joins) {
            if (join.get(30, TimeUnit.SECONDS) != null) {
                admitted++;
            }
        }
        // The host already occupies one seat, so exactly cap-1 joiners get in.
        assertThat(admitted).isEqualTo(cap - 1);
        assertThat(full.get()).isEqualTo(12 - (cap - 1));
        assertThat(roster.participants(session.getId())).hasSize(cap);
        // A rejected join leaves no orphaned participant document behind.
        assertThat(mongoTemplate.count(new Query(Criteria.where("session_id").is(session.getId())),
                Participant.class)).isEqualTo(cap);
    }

    @Test
    void anEvictedRosterSetRehydratesFromMongoRatherThanFailingTheRequest() {
        LiveSession session = openSession(50);
        Participant early = orchestrator.join(session.getRoomCode(), "user-early", "Early", null, null).participant();

        redis.delete(keys.rosterKey(session.getId()));

        // Membership still resolves — the miss falls back to the durable documents…
        assertThat(roster.contains(session.getId(), early.getParticipantId())).isTrue();
        // …and heals the set whole (host included), so the next join's cap check
        // counts the real roster rather than the one member that happened to ask.
        assertThat(redis.opsForSet().isMember(keys.rosterKey(session.getId()), early.getParticipantId())).isTrue();
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo(2L);

        orchestrator.join(session.getRoomCode(), "user-late", "Late", null, null);
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo(3L);
    }

    @Test
    void theCapStillHoldsAfterAContainsHealRebuiltTheSet() {
        int cap = 3;
        LiveSession session = openSession(cap);
        Participant early = orchestrator.join(session.getRoomCode(), "user-early", "Early", null, null).participant();

        redis.delete(keys.rosterKey(session.getId()));
        assertThat(roster.contains(session.getId(), early.getParticipantId())).isTrue();

        // The healed set carries host + early, so only the last seat is left: one
        // more join fits and the one after it is refused. A single-member heal would
        // have re-created the key undercounting by the host and let both in.
        orchestrator.join(session.getRoomCode(), "user-last", "Last", null, null);
        assertThatThrownBy(() -> orchestrator.join(session.getRoomCode(), "user-over", "Over", null, null))
                .isInstanceOfSatisfying(ConflictException.class,
                        full -> assertThat(full.getCode()).isEqualTo("SESSION_FULL"));
        assertThat(roster.participants(session.getId())).hasSize(cap);
    }

    @Test
    void aRehydratingJoinTakesTheLastSeatAndARejectedOneStrandsNothing() {
        int cap = 3;
        LiveSession session = openSession(cap);
        orchestrator.join(session.getRoomCode(), "user-early", "Early", null, null);

        // Host + early are durable with one seat free, and the set is gone: the
        // rehydrate must not count the joiner whose document it is about to admit.
        redis.delete(keys.rosterKey(session.getId()));
        orchestrator.join(session.getRoomCode(), "user-last", "Last", null, null);
        assertThat(roster.participants(session.getId())).hasSize(cap);
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo((long) cap);

        // Now full, and rehydrating again: the refusal rolls back the document and
        // leaves no phantom member inflating the set for the rest of its TTL.
        redis.delete(keys.rosterKey(session.getId()));
        assertThatThrownBy(() -> orchestrator.join(session.getRoomCode(), "user-over", "Over", null, null))
                .isInstanceOfSatisfying(ConflictException.class,
                        full -> assertThat(full.getCode()).isEqualTo("SESSION_FULL"));
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo((long) cap);
        assertThat(mongoTemplate.count(new Query(Criteria.where("session_id").is(session.getId())),
                Participant.class)).isEqualTo(cap);
        // Every surviving document is an admitted one: the refusal took its
        // marker-less document with it rather than leaving one behind.
        assertThat(roster.participants(session.getId())).hasSize(cap);
    }

    @Test
    void aMidFlightJoinerIsNotSeededByARehydrate() {
        LiveSession session = openSession(50);

        // A joiner whose document is durable but whose admit has not landed —
        // exactly what the orchestrator's join leaves between its two writes.
        Participant pending = Participant.join("user-pending", "Pending", null, null);
        pending.joinSession(session.getId());
        mongoTemplate.save(pending);

        redis.delete(keys.rosterKey(session.getId()));

        // Being durably saved is not being admitted: the document carries no
        // admission marker, so nothing on the membership side can see it.
        assertThat(roster.contains(session.getId(), pending.getParticipantId())).isFalse();

        // A heal triggered by a real member rebuilds the set whole — from the
        // admitted documents only, so the mid-flight joiner is not seeded a seat the
        // cap would then count.
        assertThat(roster.contains(session.getId(), session.getHostParticipantId())).isTrue();
        assertThat(redis.opsForSet().members(keys.rosterKey(session.getId())))
                .containsExactly(session.getHostParticipantId());
        assertThat(participantIds(session)).containsExactly(session.getHostParticipantId());
    }

    @Test
    void anAdmitIsNotRefusedForAMemberTheSetAlreadyHolds() {
        int cap = 3;
        LiveSession session = openSession(cap);
        orchestrator.join(session.getRoomCode(), "user-early", "Early", null, null);

        // An admitted member whose seat the set is about to lose — the accepted race:
        // the key goes after their admit landed, so a heal puts them back.
        Participant member = Participant.join("user-member", "Member", null, null);
        member.joinSession(session.getId());
        member.markAdmitted();
        mongoTemplate.save(member);

        // A heal on another request rehydrates the whole durable roster, this member
        // included, so the set is at the cap before an admit for them runs (a retry
        // whose first reply was lost, say).
        redis.delete(keys.rosterKey(session.getId()));
        assertThat(roster.contains(session.getId(), member.getParticipantId())).isTrue();
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo((long) cap);

        // Counting that pre-seeded id against the cap would refuse the seat it is
        // already occupying: only two other members hold seats.
        assertThat(roster.admit(session.getId(), session.getPublicId(), member.getParticipantId(), cap,
                SessionEvents.participantJoined(member))).isTrue();
        assertThat(roster.participants(session.getId())).hasSize(cap);
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo((long) cap);
    }

    @Test
    void anAdmitIsStillRefusedForAPreSeededMemberWhenEveryRealSeatIsTaken() {
        int cap = 2;
        LiveSession session = openSession(cap);
        // Host + early fill the session exactly: there is no seat left to give.
        orchestrator.join(session.getRoomCode(), "user-early", "Early", null, null);

        // A third admitted document on a two-seat session — the shape the accepted
        // cap+1 race leaves behind, and the worst case the discount has to survive.
        Participant extra = Participant.join("user-extra", "Extra", null, null);
        extra.joinSession(session.getId());
        extra.markAdmitted();
        mongoTemplate.save(extra);

        // The heal seeds every admitted document, so the set comes back over the cap.
        redis.delete(keys.rosterKey(session.getId()));
        assertThat(roster.contains(session.getId(), extra.getParticipantId())).isTrue();
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo(cap + 1L);

        // Being carried by the set is not the same as holding a seat the cap agrees
        // to. Waving the check for any id the set happens to carry would let the
        // over-capacity state grow; discounting the id from the cardinality instead
        // still counts the two other members and refuses.
        assertThat(roster.admit(session.getId(), session.getPublicId(), extra.getParticipantId(), cap,
                SessionEvents.participantJoined(extra))).isFalse();
        // A joiner the set never held is refused for the same reason.
        assertThatThrownBy(() -> orchestrator.join(session.getRoomCode(), "user-over", "Over", null, null))
                .isInstanceOfSatisfying(ConflictException.class,
                        full -> assertThat(full.getCode()).isEqualTo("SESSION_FULL"));
    }

    @Test
    void aColdKeyJoinBurstFillsTheCapExactly() throws Exception {
        int cap = 5;
        int joiners = 12;
        LiveSession session = openSession(cap);
        // With the set evicted, every joiner in the burst rehydrates — and each
        // rehydrate reads a Mongo full of its peers' speculative documents.
        redis.delete(keys.rosterKey(session.getId()));

        // Hold every join between its insert and its admit so the burst is certainly
        // in the state that used to cross-seed: all twelve speculative documents
        // durable, the set still cold, nobody admitted. Left to chance a warm JVM lets
        // the first admit land before its peers save, and there is nothing to seed.
        AtomicLong durableWhenTheBurstAdmits = new AtomicLong();
        CyclicBarrier inserted = new CyclicBarrier(joiners, () -> durableWhenTheBurstAdmits
                .set(mongoTemplate.count(new Query(Criteria.where("session_id").is(session.getId())),
                        Participant.class)));
        doAnswer(admit -> {
            inserted.await(30, TimeUnit.SECONDS);
            return admit.callRealMethod();
        }).when(roster).admit(anyString(), anyString(), anyString(), anyInt(), any());

        AtomicInteger full = new AtomicInteger();
        List<Future<Participant>> joins = runConcurrently(joiners, index -> {
            try {
                return orchestrator.join(session.getRoomCode(), "user-" + index, "Player " + index, null, null)
                        .participant();
            } catch (ConflictException rejected) {
                assertThat(rejected.getCode()).isEqualTo("SESSION_FULL");
                full.incrementAndGet();
                return null;
            }
        });

        int admitted = 0;
        for (Future<Participant> join : joins) {
            if (join.get(30, TimeUnit.SECONDS) != null) {
                admitted++;
            }
        }
        // The barrier really did establish the shape: host + every joiner's insert was
        // durable before the first rehydrate read Mongo.
        assertThat(durableWhenTheBurstAdmits.get()).isEqualTo(joiners + 1L);
        // Being durably saved is not admission. A cold-key rehydrate seeds only the
        // documents carrying the admission marker — here, the host alone — so every
        // seat is contested exactly once and the cap fills exactly rather than
        // refusing joiners that would have fit. Exactness is deterministic, not
        // lucky: the admits serialize inside Redis, whatever order the burst reaches
        // it in.
        assertThat(admitted + full.get()).isEqualTo(joiners);
        assertThat(admitted).isEqualTo(cap - 1);
        assertThat(full.get()).isEqualTo(joiners - (cap - 1));
        assertThat(roster.participants(session.getId())).hasSize(cap);
        assertThat(redis.opsForSet().size(keys.rosterKey(session.getId()))).isEqualTo((long) cap);
        assertThat(mongoTemplate.count(new Query(Criteria.where("session_id").is(session.getId())),
                Participant.class)).isEqualTo(cap);
    }

    @Test
    void aParticipantWhoLeftIsNotResurrectedByARehydrate() {
        LiveSession session = openSession(50);
        Participant leaver = orchestrator.join(session.getRoomCode(), "user-2", "Two", null, null).participant();

        orchestrator.leave(session.getId(), leaver.getParticipantId());
        redis.delete(keys.rosterKey(session.getId()));

        assertThat(roster.contains(session.getId(), leaver.getParticipantId())).isFalse();
        assertThat(participantIds(session)).doesNotContain(leaver.getParticipantId());
    }

    @Test
    void rosterListingPreservesJoinOrder() {
        LiveSession session = openSession(50);
        List<String> expected = new ArrayList<>();
        expected.add(session.getHostParticipantId());
        for (int i = 0; i < 4; i++) {
            expected.add(orchestrator.join(session.getRoomCode(), "user-" + i, "Player " + i, null, null)
                    .participant().getParticipantId());
        }

        assertThat(participantIds(session)).containsExactlyElementsOf(expected);
    }

    // ── helpers ───────────────────────────────────────────────────────────────

    /** The session's roster as participant ids, in the order the roster reports them. */
    private List<String> participantIds(LiveSession session) {
        List<String> ids = new ArrayList<>();
        for (Participant participant : roster.participants(session.getId())) {
            ids.add(participant.getParticipantId());
        }
        return ids;
    }

    /** A fresh lobby whose deck caps the roster at {@code maxParticipants}. */
    private LiveSession openSession(int maxParticipants) {
        Deck deck = new Deck();
        deck.setSettings(new Settings.DeckSettings(null, null,
                new Settings.AudienceSettings(maxParticipants, false, false, false, false, false, true), null));
        LiveSession session = orchestrator.createSession("host-user", "Hosty", null, deck);
        sessionIds.add(session.getId());
        return session;
    }

    /** Fires {@code count} tasks at once off a shared latch, so they genuinely race. */
    private <T> List<Future<T>> runConcurrently(int count, IndexedTask<T> task) throws InterruptedException {
        ExecutorService pool = Executors.newFixedThreadPool(count);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Callable<T>> calls = new ArrayList<>(count);
            for (int i = 0; i < count; i++) {
                int index = i;
                calls.add(() -> {
                    start.await();
                    return task.run(index);
                });
            }
            List<Future<T>> futures = new ArrayList<>(count);
            for (Callable<T> call : calls) {
                futures.add(pool.submit(call));
            }
            start.countDown();
            return futures;
        } finally {
            pool.shutdown();
        }
    }

    @FunctionalInterface
    private interface IndexedTask<T> {
        T run(int index);
    }
}
