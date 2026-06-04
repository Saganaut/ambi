package com.cephadex.ambi.session;

import java.time.Instant;

import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionStateStore;
import com.cephadex.ambi.session.redis.TallyStore;

/**
 * Drives a live session's round lifecycle. Every state transition runs
 * insessionIde
 * the session's lock ({@link SessionLocks#withLock}) and read-modify-writes the
 * {@link LiveRoundState} snapshot through {@link SessionStateStore}, so two
 * concurrent operations on the same session (a double-clicked start, a host
 * reveal racing a late submission, two app instances) can't interleave.
 */
public class LiveSessionOrchestrator {

    private final LiveSessionRepository repo;
    private final SessionLocks locks;
    private final SessionStateStore stateStore;
    private final TallyStore tallyStore;
    // TODO(Claude): missing collaborators — DeadlineScheduler (round/submission
    // timers) and EventPublisher (broadcasting state changes to clients) are
    // stubbed out and not yet wired into the constructor or the round transitions.
    // private final DeadlineScheduler deadlines;
    // private final EventPublisher publisher;

    public LiveSessionOrchestrator(LiveSessionRepository repo, SessionLocks locks, SessionStateStore stateStore,
            TallyStore tallyStore) {
        this.repo = repo;
        this.locks = locks;
        this.stateStore = stateStore;
        this.tallyStore = tallyStore;
    }

    /** Initialises the session's in-flight state to idle (no round in progress). */
    public void startLiveSession(String sessionId) {
        locks.withLock(sessionId, () -> stateStore.save(sessionId, LiveRoundState.idle()));
    }

    /**
     * Opens {@code slideId} for submissions, clearing any prior round's tallies.
     */
    public void startRound(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = stateStore.load(sessionId).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sessionId, slideId);
            stateStore.save(sessionId, current.startedRound(slideId, Instant.now()));
        });
    }

    /** Closes submissions on the current round and moves it to the reveal phase. */
    public void endRound(String sessionId, String slideId) {

        locks.withLock(sessionId, () -> stateStore.load(sessionId)
                .ifPresent(current -> stateStore.save(sessionId, current.withPhase(RoundPhase.REVEAL))));
        // TODO: score the closed round. Once the inputs are reachable —
        // answers (AnswerRepository is still a stub), the round's participants
        // (needs a per-session ParticipantRepository query), and the resolved
        // Settings.PointSettings for the slide — call:
        // RoundResult r = RoundScorer.score(sessionId, slide, answers,
        // participantsById,
        // pointSettings, current.roundStartedAt(), Instant.now());
        // then persist the mutated participants and save r (RoundResultRepository).
        // The slide comes from the LiveSession deck snapshot (repo); startedAt is
        // current.roundStartedAt(); the per-option counts for the reveal come from
        // tallyStore.tally(sessionId, slideId), cleared with tallyStore.clear once
        // scored.
    }

    /** Reopens {@code slideId} from scratch — fresh start time, tallies cleared. */
    public void restartRound(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = stateStore.load(sessionId).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sessionId, slideId);
            stateStore.save(sessionId, current.startedRound(slideId, Instant.now()));
        });
    }
}
