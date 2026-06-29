package com.cephadex.ambi.session;

import java.time.Instant;

import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionStateStore;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.user.Avatar;

/**
 * Drives a live session end to end — session lifecycle, the participant roster,
 * the round lifecycle, and navigation. Every state transition runs inside the
 * session's lock ({@link SessionLocks#withLock}) and read-modify-writes the
 * {@link LiveRoundState} snapshot through {@link SessionStateStore}, so two
 * concurrent operations on the same session (a double-clicked start, a host
 * reveal racing a late submission, two app instances) can't interleave. After a
 * successful transition the orchestrator publishes a {@code SessionEvent} via
 * {@link EventPublisher} — it never talks to a transport directly.
 *
 * <p>This is the seam {@code Round.java} collapses into: a round has no durable
 * document and no identity beyond {@code (sessionId, slideId)}, so its
 * transitions live here rather than in a separate object (open-decisions B1).
 *
 * <h2>Round phases</h2>
 * A standalone slide runs {@code SUBMIT → REVEAL_RESPONSES → REVEAL_RESULTS}. A
 * linked parent/child slide pair runs the parent through
 * {@code SUBMIT → REVEAL_RESPONSES}, advances into the child round, and only then
 * shows the combined {@code REVEAL_RESULTS}; a parent is never taken straight to
 * results. Whether a round is a follow-up is resolved statelessly from
 * {@link Slide#getParentId()} on the open slide — nothing extra is carried in
 * {@link LiveRoundState}.
 *
 * <p><strong>Status:</strong> the method surface below is the implementation
 * target. Methods already carrying a body are wired; the rest are stubs
 * ({@link UnsupportedOperationException}) with their intended contract documented.
 */
public class LiveSessionOrchestrator {

    private final LiveSessionRepository repo;
    private final ParticipantRepository participants;
    private final SessionLocks locks;
    private final SessionStateStore stateStore;
    private final AnswerStore answerStore;
    private final TallyStore tallyStore;
    private final PresenceStore presenceStore;
    private final EventPublisher publisher;
    // TODO(Claude): missing collaborators still to wire —
    //   - AnswerRepository: must first become a real MongoRepository (open-decisions
    //     E1); needed to flush a closed round's answers to Mongo before scoring.
    //   - RoundResultProjector / SessionLifecycleProjector: persist RoundResult +
    //     mutated participants and the LiveSession status/phase snapshot (E2).
    //   - DeadlineScheduler: round/submission timers (A3) — deferred; pause support
    //     is a LiveRoundState record change to decide before it lands.

    public LiveSessionOrchestrator(LiveSessionRepository repo, ParticipantRepository participants,
            SessionLocks locks, SessionStateStore stateStore, AnswerStore answerStore, TallyStore tallyStore,
            PresenceStore presenceStore, EventPublisher publisher) {
        this.repo = repo;
        this.participants = participants;
        this.locks = locks;
        this.stateStore = stateStore;
        this.answerStore = answerStore;
        this.tallyStore = tallyStore;
        this.presenceStore = presenceStore;
        this.publisher = publisher;
    }

    // ── Session lifecycle ────────────────────────────────────────────────────

    /**
     * Opens a brand-new session in the lobby: builds {@link LiveSession#create}
     * (minting roomCode/publicId), persists it to Mongo, seeds the Redis
     * {@link LiveRoundState#idle()} snapshot, and publishes the lobby-open event.
     * Reconciles a roomCode/publicId duplicate-key collision by re-minting (the
     * unique indexes are the authority — open-decisions F1).
     *
     * <p>Distinct from {@link #beginPlay}: creating a session only opens the
     * lobby; play starts on a separate host action.
     *
     * @param hostUserId the host's user id (becomes the host participant)
     * @param deck       the deck snapshot to run
     * @return the created session (carrying its roomCode/publicId)
     */
    public LiveSession createSession(String hostUserId, Deck deck) {
        // TODO(Claude): create host Participant + LiveSession.create, save both,
        // seed stateStore.save(id, LiveRoundState.idle()), publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Starts play: {@link LiveSession#start()} (LOBBY → IN_PROGRESS), then
     * publishes. Does not open a round — the host navigates to the first slide via
     * {@link #advance}/{@link #goTo}.
     */
    public void beginPlay(String sessionId) {
        // TODO(Claude): withLock → load session, session.start(), repo.save,
        // recordPhase snapshot, publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Ends the session normally: {@link LiveSession#endLiveSession()} (→ FINISHED),
     * clears the session's Redis state/answers/tally/presence, and publishes the
     * end event. The final standings are derived from persisted results +
     * participant scores; there is no separate results status.
     */
    public void endLiveSession(String sessionId) {
        // TODO(Claude): withLock → session.endLiveSession(), repo.save, clear all
        // Redis stores for the session, publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Cancels the session: {@link LiveSession#cancel()} (→ CANCELLED) for an
     * abandoned run (host left, never started, error), clears Redis, and
     * publishes. Use instead of {@link #endLiveSession} when the run isn't
     * completing.
     */
    public void cancelSession(String sessionId) {
        // TODO(Claude): withLock → session.cancel(), repo.save, clear Redis,
        // publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // ── Participants & presence ──────────────────────────────────────────────

    /**
     * Joins a participant via the room code (public join; guests allowed unless
     * audience settings restrict it): resolves the session, creates the
     * {@link Participant#join} record, adds it to the roster, seeds presence,
     * persists, issues the participant token for reconnection (open-decisions C2),
     * and publishes the roster change.
     *
     * @param roomCode    the human-typed room code (also the link-join code)
     * @param userId      the joining user's id (a minted guest id for guests)
     * @param displayName required display name shown to other players
     * @param avatar      optional avatar
     * @param colorTag    optional color tag
     * @return the created participant
     */
    public Participant join(String roomCode, String userId, String displayName, Avatar avatar, String colorTag) {
        // TODO(Claude): resolve session by roomCode, Participant.join(...),
        // session.addParticipant, participants.save, presenceStore.save,
        // repo.save, publisher.publish(...). Enforce max roster size (F5).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Removes a participant from the roster
     * ({@link LiveSession#removeParticipant}) and drops their presence, then
     * publishes. The host cannot leave — ending/cancelling the session is the host
     * exit path.
     */
    public void leave(String sessionId, String participantId) {
        // TODO(Claude): withLock → session.removeParticipant, presenceStore.remove,
        // repo.save, publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Re-identifies a returning participant (open-decisions C2): validates the
     * participant token / user mapping, marks them ONLINE, refreshes presence, and
     * publishes. Never trusts a client-supplied {@code participantId} without the
     * token/user match.
     *
     * @return the re-identified participant
     */
    public Participant reconnect(String sessionId, String participantId) {
        // TODO(Claude): look up participant (needs findByParticipantId), verify it
        // belongs to the session, participant.heartbeat(), presenceStore.save,
        // publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Records a liveness heartbeat: refreshes the participant's presence /
     * last-seen. Server-debounced (ignore more than ~1/sec per participant — F5).
     * Does not publish (presence is read on demand for the lobby/scoreboard).
     */
    public void heartbeat(String sessionId, String participantId) {
        // TODO(Claude): presenceStore.save(sessionId, participantId, online presence)
        // with debounce; refresh participant.lastSeenAt at the next durable flush.
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // ── Round control ────────────────────────────────────────────────────────

    /**
     * Opens {@code slideId} for submissions, clearing any prior round's tallies.
     *
     * <p>TODO(Claude): add a state guard (open-decisions F4) — reject/no-op if a
     * round is already open on a different slide — and publish the round-open
     * event. Prefer reaching a round through {@link #advance}/{@link #goTo} so the
     * slide is validated against the snapshot.
     */
    public void startRound(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = stateStore.load(sessionId).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sessionId, slideId);
            stateStore.save(sessionId, current.startedRound(slideId, Instant.now()));
            // TODO(Claude): publish RoundOpened once the slide is resolvable from the
            // deck snapshot (navigation, B3): publisher.publish(saved.publicId(),
            // SessionEvents.roundOpened(saved, slide)). The SlideView needs the Slide.
        });
    }

    /**
     * Records a participant's answer for the open round: writes it to
     * {@link AnswerStore} and bumps the per-option {@link TallyStore} count, then
     * publishes the updated live tally. Lock-free per submission by design (each is
     * a single participant-keyed write) — the choice-key derivation that feeds the
     * tally is shared with scoring so the live bar and the durable counts agree
     * (open-decisions D5).
     */
    public void submitAnswer(String sessionId, String slideId, String participantId, AnswerPayload payload) {
        // TODO(Claude): build Answer, answerStore.submit, derive option/choice key
        // via the shared helper, tallyStore.increment, publisher.publish(live tally).
        // Reject if the round isn't in SUBMIT for this slide.
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Closes submissions on the current round: SUBMIT → REVEAL_RESPONSES, so the
     * collected answers/tally can be shown before scoring.
     *
     * <p>TODO(Claude): on close, flush the round's answers to Mongo (needs the real
     * AnswerRepository — E1), score the round inline under the lock via
     * {@code RoundScorer.score(...)} resolving points with
     * {@code SlideSettings.resolvePoints(deckDefaults)} and gathering participants
     * by roster id (E4), then hand persistence to {@code RoundResultProjector}
     * (E2). Make scoring idempotent so a double-close doesn't double-award (F4/F2).
     * Then publish the responses-revealed event.
     */
    public void closeSubmissions(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> stateStore.load(sessionId).ifPresent(current -> {
            LiveRoundState revealed = current.withPhase(RoundPhase.REVEAL_RESPONSES);
            stateStore.save(sessionId, revealed);
            if (revealed.publicId() != null) {
                publisher.publish(revealed.publicId(), SessionEvents.responsesRevealed(
                        slideId, RoundPhase.REVEAL_RESPONSES, tallyStore.tally(sessionId, slideId)));
            }
        }));
        // TODO(Claude): before the reveal — flush answers to Mongo, score the round, and
        // hand persistence to RoundResultProjector (see method javadoc). The scored
        // ResultsRevealed event is published later by revealResults.
    }

    /**
     * Reveals the scored results: REVEAL_RESPONSES → REVEAL_RESULTS, then
     * publishes.
     *
     * <p>If the open slide has a {@link Slide#getParentId()} this is a follow-up
     * child round: the combined results aggregate the parent's and the child's
     * {@code RoundResult}s (both resolvable from the deck snapshot + persisted
     * results, no extra state carried). A slide that has a {@code childId} must not
     * reach results directly — {@link #advance} routes its reveal into the child
     * round first (open-decisions B3).
     *
     * <p>TODO(Claude): guard the parent→child rule, assemble combined results,
     * publish; flag the terminal round so the client can show the final podium in
     * place of a session-level results status.
     */
    public void revealResults(String sessionId, String slideId) {
        // TODO(Claude): withLock → load, withPhase(REVEAL_RESULTS), save; assemble
        // combined results for follow-ups; publisher.publish(...).
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /** Reopens {@code slideId} from scratch — fresh start time, tallies cleared. */
    public void restartRound(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = stateStore.load(sessionId).orElseGet(LiveRoundState::idle);
            tallyStore.clear(sessionId, slideId);
            LiveRoundState restarted = current.startedRound(slideId, Instant.now());
            stateStore.save(sessionId, restarted);
            if (restarted.publicId() != null) {
                publisher.publish(restarted.publicId(),
                        SessionEvents.roundRestarted(slideId, RoundPhase.SUBMIT, restarted.roundStartedAt()));
            }
            // TODO(Claude): also clear the round's answers and make re-scoring
            // idempotent (overwrite the RoundResult — F2).
        });
    }

    // ── Navigation (server-owned) ────────────────────────────────────────────

    /**
     * Advances to and opens the next round, resolving the next slide server-side
     * from the deck snapshot's Lexorank order and enforcing the linked
     * parent→child rule (open-decisions B3): from a parent's REVEAL_RESPONSES the
     * "next" slide is its child (opened as a fresh SUBMIT round), never a jump to
     * results. Returns the slide now open, or signals the terminal round when the
     * snapshot is exhausted (the cue for the final podium).
     *
     * @return the slide the new round opened on
     */
    public Slide advance(String sessionId) {
        // TODO(Claude): withLock → load snapshot, resolve next slide from sorted
        // order honoring parent/child links, startRound on it, publish; signal
        // terminal when none remain.
        throw new UnsupportedOperationException("Not implemented yet");
    }

    /**
     * Opens a specific slide by host request: validates {@code slideId} against the
     * deck snapshot (rather than trusting the client) and the parent/child rule,
     * then opens it as a round.
     */
    public void goTo(String sessionId, String slideId) {
        // TODO(Claude): withLock → verify slideId is in the snapshot and legal to
        // open, startRound on it, publish.
        throw new UnsupportedOperationException("Not implemented yet");
    }

    // ── Deferred past v1 (seams reserved) ────────────────────────────────────
    // - submitVote(...) + RoundPhase.VOTE — best-answer/deception voting (D3).
    // - pauseTimer(...) / resumeTimer(...) + DeadlineScheduler — timed rounds (A3);
    //   decide the LiveRoundState pause accumulator field before adding.
}
