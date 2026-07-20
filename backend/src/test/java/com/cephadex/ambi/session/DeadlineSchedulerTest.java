package com.cephadex.ambi.session;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentMatchers;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.data.redis.core.ValueOperations;
import org.springframework.data.redis.core.script.RedisScript;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.session.redis.DeadlineStore;
import com.cephadex.ambi.session.redis.SessionDeadline;
import com.cephadex.ambi.session.redis.SessionKeys;
import com.cephadex.ambi.session.redis.SessionRedisProperties;

/**
 * The scheduler's contract: only the leader drains the ZSET, each kind routes to
 * its orchestrator transition, a busy session lock re-schedules the deadline,
 * and one failing deadline never takes down the rest of the batch.
 */
class DeadlineSchedulerTest {

    private StringRedisTemplate redis;
    private ValueOperations<String, String> values;
    private DeadlineStore deadlines;
    private LiveSessionOrchestrator orchestrator;
    private SessionRedisProperties props;
    private DeadlineScheduler scheduler;

    @BeforeEach
    @SuppressWarnings("unchecked")
    void setUp() {
        redis = mock(StringRedisTemplate.class);
        values = mock(ValueOperations.class);
        when(redis.opsForValue()).thenReturn(values);
        deadlines = mock(DeadlineStore.class);
        orchestrator = mock(LiveSessionOrchestrator.class);
        props = new SessionRedisProperties();
        scheduler = new DeadlineScheduler(redis, new SessionKeys(props), props, deadlines, orchestrator);
    }

    private void givenLeadership() {
        when(values.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(true);
    }

    private void givenNotLeader() {
        when(values.setIfAbsent(anyString(), anyString(), any(Duration.class))).thenReturn(false);
        when(redis.execute(ArgumentMatchers.<RedisScript<Long>>any(), any(), any(Object[].class)))
                .thenReturn(0L);
    }

    @Test
    void nonLeaderNeverTouchesTheQueue() {
        givenNotLeader();

        scheduler.poll();

        verify(deadlines, never()).popDue(any(), ArgumentMatchers.anyInt());
        verify(orchestrator, never()).closeSubmissions(any(), any());
    }

    @Test
    void closeRoundDeadlineDispatchesToCloseSubmissions() {
        givenLeadership();
        when(deadlines.popDue(any(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(SessionDeadline.closeRound("sess-1", "slide-1")));

        scheduler.poll();

        verify(orchestrator).closeSubmissions("sess-1", "slide-1");
    }

    @Test
    void hostDeadlinesDispatchToTheirTransitions() {
        givenLeadership();
        when(deadlines.popDue(any(), ArgumentMatchers.anyInt()))
                .thenReturn(List.of(SessionDeadline.hostAway("sess-1"), SessionDeadline.graceCancel("sess-2")));

        scheduler.poll();

        verify(orchestrator).hostPresenceLost("sess-1");
        verify(orchestrator).hostGraceExpired("sess-2");
    }

    @Test
    void busySessionLockReschedulesTheDeadline() {
        givenLeadership();
        SessionDeadline due = SessionDeadline.closeRound("sess-1", "slide-1");
        when(deadlines.popDue(any(), ArgumentMatchers.anyInt())).thenReturn(List.of(due));
        doThrow(new ConflictException("SESSION_LOCKED", "busy"))
                .when(orchestrator).closeSubmissions("sess-1", "slide-1");

        scheduler.poll();

        verify(deadlines).schedule(eq(due), any(Instant.class));
    }

    @Test
    void otherConflictsAreDroppedNotRetried() {
        givenLeadership();
        SessionDeadline due = SessionDeadline.graceCancel("sess-1");
        when(deadlines.popDue(any(), ArgumentMatchers.anyInt())).thenReturn(List.of(due));
        doThrow(new ConflictException("SESSION_ALREADY_TERMINAL", "done"))
                .when(orchestrator).hostGraceExpired("sess-1");

        scheduler.poll();

        verify(deadlines, never()).schedule(any(), any());
    }

    @Test
    void oneFailingDeadlineDoesNotStopTheBatch() {
        givenLeadership();
        when(deadlines.popDue(any(), ArgumentMatchers.anyInt())).thenReturn(List.of(
                SessionDeadline.closeRound("sess-1", "slide-1"),
                SessionDeadline.closeRound("sess-2", "slide-2")));
        doThrow(new NotFoundException("SESSION_NOT_FOUND", "gone"))
                .when(orchestrator).closeSubmissions("sess-1", "slide-1");

        scheduler.poll();

        verify(orchestrator).closeSubmissions("sess-2", "slide-2");
        verify(deadlines, never()).schedule(any(), any());
    }
}
