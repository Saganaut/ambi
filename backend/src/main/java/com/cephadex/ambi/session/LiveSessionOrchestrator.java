package com.cephadex.ambi.session;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.AnswerTallyKeys;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.user.Avatar;

/**
 * Drives a live session end to end — session lifecycle, the participant roster,
 * the round lifecycle, and navigation. Every state transition runs inside the
 * session's lock ({@link SessionLocks#withLock}) and read-modify-writes the
 * {@link LiveRoundState} snapshot through {@link LiveRoundStateStore}, so two
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
@Service
public class LiveSessionOrchestrator {

    private final LiveSessionRepository repo;
    private final ParticipantRepository participants;
    private final SessionLocks locks;
    private final LiveRoundStateStore roundStateStore;
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
            SessionLocks locks, LiveRoundStateStore roundStateStore, AnswerStore answerStore, TallyStore tallyStore,
            PresenceStore presenceStore, EventPublisher publisher) {
        this.repo = repo;
        this.participants = participants;
        this.locks = locks;
        this.roundStateStore = roundStateStore;
        this.answerStore = answerStore;
        this.tallyStore = tallyStore;
        this.presenceStore = presenceStore;
        this.publisher = publisher;
    }

    // ── Session lifecycle ────────────────────────────────────────────────────

    /**
     * Opens a brand-new session in the lobby: creates the host {@link Participant},
     * builds {@link LiveSession#create} (minting roomCode/publicId), persists both to
     * Mongo, and seeds the Redis {@link LiveRoundState#idle()} snapshot. Reconciles a
     * roomCode duplicate-key collision by re-minting (the unique index is the
     * authority — open-decisions F1). No event is published: nobody is subscribed yet
     * (the host receives the publicId in the response and subscribes after).
     *
     * <p>Distinct from {@link #beginPlay}: creating a session only opens the
     * lobby; play starts on a separate host action.
     *
     * @param hostUserId  the host's user id (becomes the host participant)
     * @param displayName the host's display name (resolved from their profile)
     * @param avatar      the host's avatar, may be {@code null}
     * @param deck        the deck snapshot to run
     * @return the created session (carrying its roomCode/publicId)
     */
    public LiveSession createSession(String hostUserId, String displayName, Avatar avatar, Deck deck) {
        Participant host = Participant.join(hostUserId, displayName, avatar, null);
        participants.save(host);

        LiveSession session = saveWithUniqueRoomCode(LiveSession.create(host.getParticipantId(), deck));
        roundStateStore.save(session.getId(), LiveRoundState.idle(session.getPublicId()));
        return session;
    }

    /**
     * Starts play: {@link LiveSession#start()} (LOBBY → IN_PROGRESS), then
     * publishes. Does not open a round — the host navigates to the first slide via
     * {@link #advance}/{@link #goTo}.
     */
    public void beginPlay(String sessionId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            if (!session.isInLobby()) {
                throw new ConflictException("SESSION_NOT_IN_LOBBY", "play can only start from the lobby");
            }
            session.start();
            repo.save(session);
            publisher.publish(session.getPublicId(), SessionEvents.liveSessionStarted(session));
        });
    }

    /**
     * Ends the session normally: {@link LiveSession#endLiveSession()} (→ FINISHED),
     * clears the session's Redis state/answers/tally/presence, and publishes the
     * end event. The final standings are derived from persisted results +
     * participant scores; there is no separate results status.
     */
    public void endLiveSession(String sessionId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            requireNotTerminal(session);
            session.endLiveSession();
            repo.save(session);
            clearSessionRedis(session);
            publisher.publish(session.getPublicId(),
                    SessionEvents.liveSessionEnded(participants.findAllById(session.getRoster())));
        });
    }

    /**
     * Cancels the session: {@link LiveSession#cancel()} (→ CANCELLED) for an
     * abandoned run (host left, never started, error), clears Redis, and
     * publishes. Use instead of {@link #endLiveSession} when the run isn't
     * completing.
     */
    public void cancelSession(String sessionId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            requireNotTerminal(session);
            session.cancel();
            repo.save(session);
            clearSessionRedis(session);
            publisher.publish(session.getPublicId(), SessionEvents.liveSessionCancelled("Cancelled by host"));
        });
    }

    // ── Participants & presence ──────────────────────────────────────────────

    /**
     * Joins a participant via the room code (public join; guests allowed): resolves
     * the live session, creates the {@link Participant#join} record, adds it to the
     * roster, seeds presence, persists, and publishes the roster change. An unknown
     * or terminal room code is masked as a 404 (the code is a guessable key).
     *
     * @param roomCode    the human-typed room code (also the link-join code)
     * @param userId      the joining user's id (a minted guest id for guests)
     * @param displayName required display name shown to other players
     * @param avatar      optional avatar
     * @param colorTag    optional color tag
     * @return the joined session (for its publicId) and the new participant
     */
    public JoinResult join(String roomCode, String userId, String displayName, Avatar avatar, String colorTag) {
        LiveSession session = repo.findByRoomCode(roomCode)
                .filter(found -> !found.isTerminal())
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));

        Participant participant = Participant.join(userId, displayName, avatar, colorTag);
        participants.save(participant);

        session.addParticipant(participant.getParticipantId());
        repo.save(session);
        presenceStore.save(session.getId(), participant.getParticipantId(), Presence.online(Instant.now()));

        publisher.publish(session.getPublicId(), SessionEvents.participantJoined(participant, session.getRoster()));
        return new JoinResult(session, participant);
    }

    /**
     * Removes a participant from the roster
     * ({@link LiveSession#removeParticipant}) and drops their presence, then
     * publishes. The host cannot leave — ending/cancelling the session is the host
     * exit path.
     */
    public void leave(String sessionId, String participantId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            if (session.isHost(participantId)) {
                throw new ConflictException("HOST_CANNOT_LEAVE",
                        "the host ends or cancels the session instead of leaving");
            }
            session.removeParticipant(participantId);
            presenceStore.remove(sessionId, participantId);
            repo.save(session);
            publisher.publish(session.getPublicId(),
                    SessionEvents.participantLeft(participantId, session.getRoster()));
        });
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
        // belongs to the session, participant.heartbeat(), presenceStore.save, then
        // publisher.publish(publicId, SessionEvents.participantReconnected(participant)).
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
     * The initial phase comes from the slide's {@link ResultsDisplayMode}:
     * {@code IMMEDIATE} opens live ({@link RoundPhase#SUBMIT_LIVE}), everything else
     * opens hidden ({@link RoundPhase#SUBMIT}). Publishes {@code RoundStarted}.
     *
     * <p>TODO(Claude): add a state guard (open-decisions F4) — reject if a round is
     * already open on a different slide. Prefer reaching a round through
     * {@link #advance}/{@link #goTo} so the slide is validated against the snapshot.
     */
    public void startRound(String sessionId, String slideId) {
        openRound(sessionId, slideId, false);
    }

    /**
     * Records a participant's answer for the open round: writes it to
     * {@link AnswerStore} and reconciles the per-option {@link TallyStore} counts,
     * then publishes the updated live tally. Lock-free per submission by design
     * (each is a single participant-keyed write) — the per-option keys that feed the
     * tally come from {@link AnswerTallyKeys}, shared with scoring so the live bar
     * and the durable counts agree (open-decisions D5).
     *
     * <p>{@code maxSelections} is the slide's resolved answer setting: {@code 1}
     * (single-answer) makes the first submission final — a later one is ignored;
     * otherwise the latest submission overwrites and the tally is reconciled (the
     * prior selection is backed out before the new one is applied).
     *
     * @throws ConflictException if no round is open for {@code slideId}, or it is no
     *                           longer accepting submissions
     */
    public void submitAnswer(String sessionId, String slideId, String participantId,
            AnswerPayload payload, int maxSelections) {
        LiveRoundState state = roundStateStore.load(sessionId).orElse(null);
        if (state == null || !slideId.equals(state.currentSlideId()) || !state.phase().acceptsSubmissions()) {
            throw new ConflictException("ROUND_NOT_OPEN", "this slide is not accepting submissions");
        }

        Optional<Answer> prior = answerStore.answerOf(sessionId, slideId, participantId);
        if (maxSelections == 1 && prior.isPresent()) {
            return; // single-answer slide: the first submission is final
        }

        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(sessionId);
        answer.setSlideId(slideId);
        answer.setSubmittedAt(Instant.now());
        answer.setPayload(payload);
        answerStore.submit(sessionId, slideId, answer);

        // Reconcile the per-option tally: back out the prior selection (a multi-select
        // change), then apply the new one, so each option's bar reflects current picks.
        prior.ifPresent(p -> AnswerTallyKeys.optionKeys(p.getPayload())
                .forEach(key -> tallyStore.decrement(sessionId, slideId, key)));
        AnswerTallyKeys.optionKeys(payload)
                .forEach(key -> tallyStore.increment(sessionId, slideId, key));

        if (state.publicId() != null) {
            publisher.publish(state.publicId(),
                    SessionEvents.tallyUpdated(slideId, tallyStore.tally(sessionId, slideId)));
        }
    }

    /**
     * Closes submissions on the current round, <strong>preserving what's on
     * display</strong>: a hidden round ({@code SUBMIT}) locks to {@code LOCKED}
     * (submissions stopped, nothing revealed); a live round ({@code SUBMIT_LIVE})
     * closes to {@code REVEAL_RESPONSES}. Idempotent — a no-op if already closed.
     * Publishes {@code SubmissionsLocked} (hidden) or {@code ResponsesRevealed}
     * (live), matching the phase entered.
     *
     * <p>TODO(Claude): on close, flush the round's answers to Mongo (needs the real
     * AnswerRepository — E1) and score the round via {@code RoundScorer.score(...)}
     * (resolving points with {@code SlideSettings.resolvePoints}, gathering
     * participants by roster id — E4), then hand persistence to
     * {@code RoundResultProjector} (E2). The scored {@code ResultsRevealed} event is
     * published later by {@link #revealResults}.
     */
    public void closeSubmissions(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            if (current.phase().isClosed()) {
                return; // already closed — idempotent
            }
            // Preserve display across the close: live → responses, hidden → locked.
            boolean responsesShown = current.phase().showsResponses();
            RoundPhase closedPhase = responsesShown ? RoundPhase.REVEAL_RESPONSES : RoundPhase.LOCKED;
            LiveRoundState closed = current.withPhase(closedPhase);
            roundStateStore.save(sessionId, closed);
            if (closed.publicId() != null) {
                SessionEvent event = responsesShown
                        ? SessionEvents.responsesRevealed(slideId, tallyStore.tally(sessionId, slideId))
                        : SessionEvents.submissionsLocked(slideId);
                publisher.publish(closed.publicId(), event);
            }
        }));
    }

    /**
     * Shows the response distribution. While submissions are open this enables live
     * results ({@code SUBMIT → SUBMIT_LIVE}, publishes {@code LiveResultsShown});
     * after a hidden lock it reveals them ({@code LOCKED → REVEAL_RESPONSES},
     * publishes {@code ResponsesRevealed}). Idempotent — a no-op if responses are
     * already showing. Never exposes the answer key (that is results, and requires
     * {@link #revealResults}).
     */
    public void revealResponses(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            if (current.phase().showsResponses()) {
                return; // already showing — idempotent
            }
            Map<String, Integer> counts = tallyStore.tally(sessionId, slideId);
            boolean stillOpen = current.phase().acceptsSubmissions();
            RoundPhase next = stillOpen ? RoundPhase.SUBMIT_LIVE : RoundPhase.REVEAL_RESPONSES;
            LiveRoundState updated = current.withPhase(next);
            roundStateStore.save(sessionId, updated);
            if (updated.publicId() != null) {
                // Going live mid-round carries no slide (the client has it from RoundStarted).
                SessionEvent event = stillOpen
                        ? SessionEvents.liveResultsShown(updated, counts)
                        : SessionEvents.responsesRevealed(slideId, counts);
                publisher.publish(updated.publicId(), event);
            }
        }));
    }

    /**
     * Reveals the scored results: → {@code REVEAL_RESULTS}.
     *
     * <p><strong>Guarded:</strong> submissions must be closed first — revealing
     * scored results (which expose the correct answer) while a round is still open
     * is rejected, so the answer key can't leak to players still answering.
     *
     * <p>For a follow-up child round ({@link Slide#getParentId()} present) the
     * combined parent+child results are assembled from the deck snapshot + persisted
     * results; a slide with a {@code childId} reveals into its child first via
     * {@link #advance} (open-decisions B3).
     *
     * <p>TODO(Claude): score (flush answers, {@code RoundScorer}, persist via
     * {@code RoundResultProjector}) and publish {@code ResultsRevealed} with the
     * combined results + terminal flag. The phase transition and the
     * results-require-closed guard are done here.
     */
    public void revealResults(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            if (!current.phase().isClosed()) {
                throw new IllegalStateException(
                        "cannot reveal results while submissions are open (phase " + current.phase() + ")");
            }
            roundStateStore.save(sessionId, current.withPhase(RoundPhase.REVEAL_RESULTS));
            // TODO(Claude): score + persist + publish ResultsRevealed (see javadoc).
        }));
    }

    /** Reopens {@code slideId} from scratch — fresh start time, answers and tallies cleared. */
    public void restartRound(String sessionId, String slideId) {
        openRound(sessionId, slideId, true);
    }

    /**
     * Shared open/reopen path. Resolves the slide and its initial phase from the
     * deck snapshot, clears the round's tally (and answers on a restart), saves the
     * fresh {@link LiveRoundState}, and publishes the event for the phase entered:
     * {@code RoundRestarted} on a restart, else {@code LiveResultsShown} (opened
     * live) or {@code RoundStarted} (opened hidden).
     */
    private void openRound(String sessionId, String slideId, boolean restart) {
        LiveSession session = repo.findById(sessionId)
                .orElseThrow(() -> new IllegalStateException("session not found: " + sessionId));
        Slide slide = session.getDeck().findSlide(slideId)
                .orElseThrow(() -> new IllegalArgumentException("slide not in deck snapshot: " + slideId));
        RoundPhase phase = initialPhaseFor(session, slide);
        locks.withLock(sessionId, () -> {
            LiveRoundState current = roundStateStore.load(sessionId)
                    .orElseGet(() -> LiveRoundState.idle(session.getPublicId()));
            tallyStore.clear(sessionId, slideId);
            if (restart) {
                answerStore.clear(sessionId, slideId);
            }
            LiveRoundState started = current.startedRound(slideId, Instant.now(), phase);
            roundStateStore.save(sessionId, started);
            SessionEvent event;
            if (restart) {
                event = SessionEvents.roundRestarted(slideId, phase, started.roundStartedAt());
            } else if (phase == RoundPhase.SUBMIT_LIVE) {
                event = SessionEvents.liveResultsShown(started, slide, tallyStore.tally(sessionId, slideId));
            } else {
                event = SessionEvents.roundStarted(started, slide);
            }
            publisher.publish(session.getPublicId(), event);
        });
    }

    /**
     * The phase a round opens in, from the slide's resolved
     * {@link ResultsDisplayMode}: {@code IMMEDIATE} → live, everything else hidden.
     */
    private RoundPhase initialPhaseFor(LiveSession session, Slide slide) {
        Settings.AnswerSettings answer = Settings.effectiveAnswerSettings(
                session.getDeck().getSettings(), slide.getSettings());
        ResultsDisplayMode mode = answer == null ? null : answer.displayResultsMode();
        return mode == ResultsDisplayMode.IMMEDIATE ? RoundPhase.SUBMIT_LIVE : RoundPhase.SUBMIT;
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

    // ── Lifecycle helpers ────────────────────────────────────────────────────

    private LiveSession requireSession(String sessionId) {
        return repo.findById(sessionId)
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));
    }

    private void requireNotTerminal(LiveSession session) {
        if (session.isTerminal()) {
            throw new ConflictException("SESSION_ALREADY_TERMINAL", "session is already finished or cancelled");
        }
    }

    /** Persists a new session, re-minting the room code on a uniqueness collision (≤5 tries). */
    private LiveSession saveWithUniqueRoomCode(LiveSession session) {
        for (int attempt = 0; attempt < 5; attempt++) {
            try {
                return repo.save(session);
            } catch (DuplicateKeyException collision) {
                session.regenerateRoomCode();
            }
        }
        throw new ConflictException("ROOM_CODE_UNAVAILABLE", "could not allocate a unique room code");
    }

    /** Drops every Redis key for a now-terminal session (state, presence, per-round answers/tallies). */
    private void clearSessionRedis(LiveSession session) {
        String sessionId = session.getId();
        roundStateStore.clear(sessionId);
        presenceStore.clear(sessionId);
        for (Slide slide : session.getDeck().getSlides()) {
            answerStore.clear(sessionId, slide.getId());
            tallyStore.clear(sessionId, slide.getId());
        }
    }

    /** The outcome of a successful {@link #join}: the session (for its publicId) and the new participant. */
    public record JoinResult(LiveSession session, Participant participant) {
    }
}
