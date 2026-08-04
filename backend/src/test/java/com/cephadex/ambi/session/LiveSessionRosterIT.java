package com.cephadex.ambi.session;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicInteger;

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

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.config.AmbiApplication;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.SessionRoster;
import com.cephadex.ambi.session.redis.SessionKeys;

/**
 * Exercises the roster against the real Docker Mongo + Redis the test profile
 * points at — the properties this change exists for can only be shown with both:
 * concurrent joins all succeed (they used to lose the fail-fast session lock and
 * 409 with {@code SESSION_LOCKED}), the participant cap still holds exactly under
 * that concurrency <em>and</em> across a rehydrate from either entry point, an
 * evicted Redis set rehydrates instead of failing the request, a refused join
 * strands nothing in the set, and join order survives into the roster listing.
 */
@SpringBootTest(classes = AmbiApplication.class)
@ActiveProfiles("test")
class LiveSessionRosterIT {

    @Autowired
    private LiveSessionOrchestrator orchestrator;

    @Autowired
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
