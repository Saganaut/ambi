package com.cephadex.ambi.session.redis;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Instant;

import org.junit.jupiter.api.Test;

import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

/**
 * The timer arithmetic of ADR 002: the deadline is
 * {@code roundStartedAt + durationMs + accumulatedPauseMs}, pauses fold into the
 * accumulator on resume, and an untimed round never grows a deadline.
 */
class LiveRoundStateTest {

    private static final Instant T0 = Instant.parse("2026-07-20T12:00:00Z");

    private LiveRoundState timedRound(long durationMs) {
        return LiveRoundState.idle("pub-1").startedRound("slide-1", T0, RoundPhase.SUBMIT, durationMs);
    }

    @Test
    void untimedRoundHasNoDeadline() {
        LiveRoundState state = LiveRoundState.idle("pub-1").startedRound("slide-1", T0, RoundPhase.SUBMIT, null);

        assertThat(state.timed()).isFalse();
        assertThat(state.deadline()).isNull();
    }

    @Test
    void deadlineIsStartPlusDuration() {
        LiveRoundState state = timedRound(30_000L);

        assertThat(state.timed()).isTrue();
        assertThat(state.isPaused()).isFalse();
        assertThat(state.deadline()).isEqualTo(T0.plusMillis(30_000L));
    }

    @Test
    void resumeFoldsThePauseIntoTheDeadline() {
        // Pause 10s in, resume 15s later: the deadline moves out by exactly the pause.
        LiveRoundState paused = timedRound(30_000L).paused(T0.plusSeconds(10));
        assertThat(paused.isPaused()).isTrue();
        assertThat(paused.deadline()).isEqualTo(T0.plusMillis(30_000L)); // frozen as-at-pause value

        LiveRoundState resumed = paused.resumed(T0.plusSeconds(25));

        assertThat(resumed.isPaused()).isFalse();
        assertThat(resumed.accumulatedPauseMs()).isEqualTo(15_000L);
        assertThat(resumed.deadline()).isEqualTo(T0.plusMillis(45_000L));
    }

    @Test
    void repeatedPausesAccumulate() {
        LiveRoundState state = timedRound(30_000L)
                .paused(T0.plusSeconds(5)).resumed(T0.plusSeconds(10))
                .paused(T0.plusSeconds(20)).resumed(T0.plusSeconds(22));

        assertThat(state.accumulatedPauseMs()).isEqualTo(7_000L);
        assertThat(state.deadline()).isEqualTo(T0.plusMillis(37_000L));
    }

    @Test
    void resumeNeverSubtractsOnClockSkew() {
        LiveRoundState resumed = timedRound(30_000L).paused(T0.plusSeconds(10)).resumed(T0.plusSeconds(8));

        assertThat(resumed.accumulatedPauseMs()).isZero();
    }

    @Test
    void startedRoundResetsPauseBookkeeping() {
        LiveRoundState carried = timedRound(30_000L).paused(T0.plusSeconds(5)).resumed(T0.plusSeconds(9));

        LiveRoundState next = carried.startedRound("slide-2", T0.plusSeconds(60), RoundPhase.SUBMIT, null);

        assertThat(next.durationMs()).isNull();
        assertThat(next.pausedAt()).isNull();
        assertThat(next.accumulatedPauseMs()).isZero();
    }

    @Test
    void withPhasePreservesTimerFields() {
        LiveRoundState paused = timedRound(30_000L).paused(T0.plusSeconds(10));

        LiveRoundState closed = paused.withPhase(RoundPhase.LOCKED);

        assertThat(closed.durationMs()).isEqualTo(30_000L);
        assertThat(closed.pausedAt()).isEqualTo(T0.plusSeconds(10));
    }

    @Test
    void hostLossPauseIsFlaggedButADeliberatePauseIsNot() {
        assertThat(timedRound(30_000L).paused(T0.plusSeconds(10)).autoPaused()).isFalse();
        assertThat(timedRound(30_000L).pausedByHostLoss(T0.plusSeconds(10)).autoPaused()).isTrue();
    }

    @Test
    void resumeClearsTheAutoPauseFlag() {
        LiveRoundState resumed = timedRound(30_000L)
                .pausedByHostLoss(T0.plusSeconds(10))
                .resumed(T0.plusSeconds(25));

        assertThat(resumed.autoPaused()).isFalse();
        assertThat(resumed.accumulatedPauseMs()).isEqualTo(15_000L);
    }
}
