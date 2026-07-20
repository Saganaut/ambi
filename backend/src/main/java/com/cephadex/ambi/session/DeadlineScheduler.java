package com.cephadex.ambi.session;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.script.DefaultRedisScript;
import org.springframework.data.redis.core.script.RedisScript;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.session.redis.DeadlineStore;
import com.cephadex.ambi.session.redis.SessionDeadline;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * The single poller behind the auto-close round timers (ADR 002). Every app
 * instance runs this component, but on each tick only the <strong>leader</strong>
 * — the instance holding the Redis leader lease — drains the deadline ZSET, so
 * two instances never race to fire the same deadline. Leadership is a
 * {@code SET NX PX} + compare-and-renew lease (the same token protocol as
 * {@code SessionLocks}); a crashed leader's lease self-expires and any instance
 * takes over on its next tick.
 *
 * <p>The scheduler owns <em>when</em>, never <em>what</em>: each popped
 * {@link SessionDeadline} dispatches into the same locked, idempotent
 * {@link LiveSessionOrchestrator} transitions a host command uses
 * ({@code closeSubmissions}, {@code hostPresenceLost}, {@code hostGraceExpired}),
 * which re-validate state under the session lock — a host may have closed the
 * round manually first, and that must remain a no-op.
 *
 * <p>Failure policy per deadline: a busy session lock ({@code SESSION_LOCKED})
 * re-schedules the deadline a short {@code retryDelay} out (the transition is
 * owed, not optional); a vanished session or any other conflict drops it (the
 * state it targeted no longer exists); an unexpected error is logged and dropped
 * rather than allowed to wedge the poll.
 */
@Component
public class DeadlineScheduler {

    private static final Logger log = LoggerFactory.getLogger(DeadlineScheduler.class);

    /** Renew-if-still-mine: refresh the lease TTL only while it still holds our token. */
    private static final RedisScript<Long> RENEW_LEASE = new DefaultRedisScript<>(
            """
            if redis.call('get', KEYS[1]) == ARGV[1] then
                redis.call('pexpire', KEYS[1], ARGV[2])
                return 1
            else
                return 0
            end
            """, Long.class);

    private final StringRedisTemplate redis;
    private final SessionKeys keys;
    private final SessionRedisProperties props;
    private final DeadlineStore deadlines;
    private final LiveSessionOrchestrator orchestrator;

    /** This instance's leader-lease token; random per process, like a lock token. */
    private final String instanceToken = UUID.randomUUID().toString();

    public DeadlineScheduler(StringRedisTemplate redis, SessionKeys keys, SessionRedisProperties props,
            DeadlineStore deadlines, LiveSessionOrchestrator orchestrator) {
        this.redis = redis;
        this.keys = keys;
        this.props = props;
        this.deadlines = deadlines;
        this.orchestrator = orchestrator;
    }

    /**
     * One poll tick: claim/renew leadership, then pop and dispatch the due
     * deadlines (up to the configured batch; the rest wait for the next tick).
     * Never throws — a scheduler tick that dies would silently stop all timers.
     */
    @Scheduled(fixedDelayString = "${ambi.session.deadlines.poll-interval:PT1S}")
    public void poll() {
        try {
            if (!tryLead()) {
                return;
            }
            Instant now = Instant.now();
            for (SessionDeadline due : deadlines.popDue(now, props.getDeadlines().getBatchSize())) {
                dispatch(due, now);
            }
        } catch (RuntimeException e) {
            log.warn("Deadline poll tick failed; will retry on the next tick", e);
        }
    }

    /**
     * Whether this instance is (now) the leader: takes the lease if free, else
     * renews it if we already hold it. Losing both means another instance leads.
     */
    private boolean tryLead() {
        Boolean acquired = redis.opsForValue().setIfAbsent(keys.deadlineLeaderKey(), instanceToken,
                props.getDeadlines().getLeaderLease());
        if (Boolean.TRUE.equals(acquired)) {
            return true;
        }
        Long renewed = redis.execute(RENEW_LEASE, List.of(keys.deadlineLeaderKey()), instanceToken,
                String.valueOf(props.getDeadlines().getLeaderLease().toMillis()));
        return Long.valueOf(1L).equals(renewed);
    }

    /** Routes one due deadline into its orchestrator transition, applying the failure policy. */
    private void dispatch(SessionDeadline due, Instant now) {
        try {
            switch (due.kind()) {
                case CLOSE_ROUND -> orchestrator.closeSubmissions(due.sessionId(), due.slideId());
                case HOST_AWAY -> orchestrator.hostPresenceLost(due.sessionId());
                case GRACE_CANCEL -> orchestrator.hostGraceExpired(due.sessionId());
            }
        } catch (ConflictException e) {
            if ("SESSION_LOCKED".equals(e.getCode())) {
                // The session is mid-operation; the transition is owed — retry shortly.
                deadlines.schedule(due, now.plus(props.getDeadlines().getRetryDelay()));
            } else {
                log.debug("Dropping deadline {} — state moved on ({})", due.member(), e.getCode());
            }
        } catch (NotFoundException e) {
            log.debug("Dropping deadline {} — session no longer exists", due.member());
        } catch (RuntimeException e) {
            log.warn("Deadline {} failed to dispatch; dropping it", due.member(), e);
        }
    }
}
