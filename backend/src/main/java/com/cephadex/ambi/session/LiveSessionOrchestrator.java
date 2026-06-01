package com.cephadex.ambi.session;

import java.time.Instant;

import com.cephadex.ambi.session.SessionTypes.SessionId;
import com.cephadex.ambi.session.SessionTypes.SlideId;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionStateStore;
import com.cephadex.ambi.session.redis.TallyStore;

/**
 * Drives a live session's round lifecycle. Every state transition runs inside
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
    public void startLiveSession(SessionId sid) {
        locks.withLock(sid, () -> stateStore.save(sid, LiveRoundState.idle()));
    }

    /** Opens {@code slideId} for submissions, clearing any prior round's tallies. */
    public void startRound(SessionId sid, SlideId slideId) {
        locks.withLock(sid, () -> {
            LiveRoundState current = stateStore.load(sid).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sid, slideId);
            stateStore.save(sid, current.startedRound(slideId.value(), Instant.now()));
        });
    }

    /** Closes submissions on the current round and moves it to the reveal phase. */
    public void endRound(SessionId sid, SlideId slideId) {
        locks.withLock(sid, () -> stateStore.load(sid)
                .ifPresent(current -> stateStore.save(sid, current.withPhase(RoundPhase.REVEAL))));
        // TODO: score the closed round. Once the inputs are reachable —
        // answers (AnswerRepository is still a stub), the round's participants
        // (needs a per-session ParticipantRepository query), and the resolved
        // Settings.PointSettings for the slide — call:
        //   RoundResult r = RoundScorer.score(sid, slide, answers, participantsById,
        //           pointSettings, current.roundStartedAt(), Instant.now());
        // then persist the mutated participants and save r (RoundResultRepository).
        // The slide comes from the LiveSession deck snapshot (repo); startedAt is
        // current.roundStartedAt(); the per-option counts for the reveal come from
        // tallyStore.tally(sid, slideId), cleared with tallyStore.clear once scored.
    }

    /** Reopens {@code slideId} from scratch — fresh start time, tallies cleared. */
    public void restartRound(SessionId sid, SlideId slideId) {
        locks.withLock(sid, () -> {
            LiveRoundState current = stateStore.load(sid).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sid, slideId);
            stateStore.save(sid, current.startedRound(slideId.value(), Instant.now()));
        });
    }
}
