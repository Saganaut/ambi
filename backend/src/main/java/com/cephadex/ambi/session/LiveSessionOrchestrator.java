package com.cephadex.ambi.session;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.SlideRankService;
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
import com.cephadex.ambi.session.roundResult.RoundResult;
import com.cephadex.ambi.session.roundResult.RoundResultProjector;
import com.cephadex.ambi.session.roundResult.RoundScorer;
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
 * <p><strong>Status:</strong> the full orchestrator surface is wired — session
 * lifecycle, roster, presence/reconnect, the round lifecycle (open → close+score →
 * reveal), and server-owned navigation. Deferred seams (best-answer/deception
 * voting, timed rounds, combined follow-up reveal) are noted at their call sites
 * and in the deferred block near the end.
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
    private final RoundResultProjector roundResults;
    // DeadlineScheduler (round/submission timers, A3) is still deferred; pause
    // support is a LiveRoundState record change to decide before it lands.

    /**
     * Server-side debounce for {@link #heartbeat}: a beat landing within this window
     * of the last-seen presence is a no-op, so a chatty client can't hammer Redis.
     * Kept typed rather than a bare literal; move to {@code SessionRedisProperties}
     * if it ever needs to be tuned per environment.
     */
    private static final Duration HEARTBEAT_DEBOUNCE = Duration.ofSeconds(1);

    /** Zero-points fallback so an unconfigured slide still scores (0 points) instead of NPEing. */
    private static final Settings.PointSettings NO_POINTS =
            new Settings.PointSettings(0, 0, 0, 0, Map.of(), false);

    public LiveSessionOrchestrator(LiveSessionRepository repo, ParticipantRepository participants,
            SessionLocks locks, LiveRoundStateStore roundStateStore, AnswerStore answerStore, TallyStore tallyStore,
            PresenceStore presenceStore, EventPublisher publisher, RoundResultProjector roundResults) {
        this.repo = repo;
        this.participants = participants;
        this.locks = locks;
        this.roundStateStore = roundStateStore;
        this.answerStore = answerStore;
        this.tallyStore = tallyStore;
        this.presenceStore = presenceStore;
        this.publisher = publisher;
        this.roundResults = roundResults;
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
        // participantId is already resolved from the authenticated user upstream
        // (ParticipantResolver, as leave/submit do — there is no participant token);
        // we re-verify roster membership defensively before touching presence.
        Participant participant = participants.findById(participantId)
                .orElseThrow(() -> new NotFoundException("PARTICIPANT_NOT_FOUND", "participant not found"));
        LiveSession session = requireSession(sessionId);
        if (!session.hasParticipant(participantId)) {
            throw new ForbiddenException("NOT_A_PARTICIPANT", "participant is not on this session's roster");
        }
        participant.heartbeat(); // ONLINE + lastSeenAt
        participants.save(participant);
        presenceStore.save(sessionId, participantId, Presence.online(Instant.now()));
        publisher.publish(session.getPublicId(), SessionEvents.participantReconnected(participant));
        return participant;
    }

    /**
     * Records a liveness heartbeat: refreshes the participant's presence /
     * last-seen. Server-debounced (ignore more than ~1/sec per participant — F5).
     * Does not publish (presence is read on demand for the lobby/scoreboard).
     */
    public void heartbeat(String sessionId, String participantId) {
        Instant now = Instant.now();
        // Debounce: ignore a beat that lands within HEARTBEAT_DEBOUNCE of the last
        // recorded presence, so a chatty client can't hammer Redis. The participant
        // document's lastSeenAt is refreshed at the next durable flush (reconnect /
        // round close), not per beat.
        Optional<Presence> current = presenceStore.find(sessionId, participantId);
        if (current.isPresent() && current.get().lastSeenAt() != null
                && Duration.between(current.get().lastSeenAt(), now).compareTo(HEARTBEAT_DEBOUNCE) < 0) {
            return;
        }
        presenceStore.save(sessionId, participantId, Presence.online(now));
    }

    // ── Round control ────────────────────────────────────────────────────────

    /**
     * Opens {@code slideId} for submissions, clearing any prior round's tallies.
     * The initial phase comes from the slide's {@link ResultsDisplayMode}:
     * {@code IMMEDIATE} opens live ({@link RoundPhase#SUBMIT_LIVE}), everything else
     * opens hidden ({@link RoundPhase#SUBMIT}). Publishes {@code RoundStarted}.
     *
     * <p>Guarded by {@link #requireRoundOpenable} (open-decisions F4): rejects
     * opening a different slide while a round is still accepting submissions. Prefer
     * reaching a round through {@link #advance}/{@link #goTo} so the slide is
     * validated against the snapshot.
     */
    public void startRound(String sessionId, String slideId) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        locks.withLock(sessionId, () -> {
            requireRoundOpenable(sessionId, slideId);
            openRoundUnlocked(session, slide, false);
        });
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
     * <p>On close the round is <strong>scored exactly once</strong> (the idempotent
     * guard makes a re-close a no-op): the in-flight answers are flushed to Mongo,
     * graded and points awarded via {@link RoundScorer}, and the record + mutated
     * participants persisted through {@link RoundResultProjector}. The scored
     * {@code ResultsRevealed} event is published later by {@link #revealResults}.
     */
    public void closeSubmissions(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            if (current.phase().isClosed()) {
                return; // already closed — idempotent; scoring happens once, on the close transition
            }
            // Preserve display across the close: live → responses, hidden → locked.
            boolean responsesShown = current.phase().showsResponses();
            RoundPhase closedPhase = responsesShown ? RoundPhase.REVEAL_RESPONSES : RoundPhase.LOCKED;
            LiveRoundState closed = current.withPhase(closedPhase);
            roundStateStore.save(sessionId, closed);

            // Freeze + score the round, then persist (durable-before-notify). Redis
            // answers/tally are kept — the Mongo copy is the durable one, and the live
            // data stays available for a restart; it clears on restart/session end.
            scoreAndPersistRound(sessionId, slideId, current.roundStartedAt());

            if (closed.publicId() != null) {
                SessionEvent event = responsesShown
                        ? SessionEvents.responsesRevealed(slideId, tallyStore.tally(sessionId, slideId))
                        : SessionEvents.submissionsLocked(slideId);
                publisher.publish(closed.publicId(), event);
            }
        }));
    }

    /**
     * Flushes the round's in-flight answers, scores them (grading + point awards
     * mutate the roster in memory), and persists the record + participants. Called
     * inside the session lock on the close transition.
     */
    private void scoreAndPersistRound(String sessionId, String slideId, Instant roundStartedAt) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        List<Answer> flushed = answerStore.answers(sessionId, slideId);
        List<Participant> roster = participants.findAllById(session.getRoster());
        Map<String, Participant> byId = new HashMap<>();
        for (Participant participant : roster) {
            byId.put(participant.getParticipantId(), participant);
        }
        Settings.PointSettings points = resolvePoints(session, slide);
        RoundResult result = RoundScorer.score(
                sessionId, slide, flushed, byId, points, roundStartedAt, Instant.now());
        // byId values are the same objects as `roster`, so scoring mutated them.
        roundResults.persist(result, roster, flushed);
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
     * <p><strong>Closes and scores an open round in the same step.</strong> When
     * submissions are still open the round is closed and scored here before the
     * reveal, so the host no longer needs a separate close first. The answer key
     * still can't leak to players who are answering — submissions are closed
     * atomically under the session lock before {@code REVEAL_RESULTS} is
     * published — and scoring still runs exactly once, on the open→closed
     * transition, so a round already closed at its own close is not re-scored.
     *
     * <p>For a follow-up child round ({@link Slide#getParentId()} present) the
     * combined parent+child results are assembled from the deck snapshot + persisted
     * results; a slide with a {@code childId} reveals into its child first via
     * {@link #advance} (open-decisions B3).
     *
     * <p>Publishes the {@link RoundResult} already scored at close (this method never
     * re-scores). {@code terminal} is set when this is the last round of the deck
     * snapshot, the cue for the final podium.
     *
     * <p>Combined parent+child results for a follow-up round are a seam: the
     * {@code resultsRevealed} factory takes a single record, so v1 publishes the
     * child's own result (open-decisions B3).
     */
    public void revealResults(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            // Revealing results also closes an open round: score it once here, on
            // the open→closed transition. Saving REVEAL_RESULTS before scoring keeps
            // the answer key from ever showing while submissions are still open. A
            // round already closed at its own close is not re-scored (score-once).
            boolean wasOpen = !current.phase().isClosed();
            roundStateStore.save(sessionId, current.withPhase(RoundPhase.REVEAL_RESULTS));
            if (wasOpen) {
                scoreAndPersistRound(sessionId, slideId, current.roundStartedAt());
            }

            // Read the result scored at close (or just now); publish it. A slide
            // that produced no scored record (nothing to reveal) still advances the
            // phase but sends no reveal payload.
            RoundResult result = roundResults.find(sessionId, slideId).orElse(null);
            if (result == null || current.publicId() == null) {
                return;
            }
            LiveSession session = requireSession(sessionId);
            List<Participant> roster = participants.findAllById(session.getRoster());
            boolean terminal = isLastRound(session, slideId);
            publisher.publish(current.publicId(), SessionEvents.resultsRevealed(result, roster, terminal));
        }));
    }

    /**
     * Reopens {@code slideId} from scratch — fresh start time, answers and tallies
     * cleared. Blocked once the round has been scored at close: reopening and
     * re-closing would double-award its cumulative points, and there is no
     * point-reversal path yet (open-decisions B2). Restart before close is allowed.
     */
    public void restartRound(String sessionId, String slideId) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        locks.withLock(sessionId, () -> {
            if (roundResults.find(sessionId, slideId).isPresent()) {
                throw new ConflictException("ROUND_ALREADY_SCORED",
                        "cannot restart a round whose results were already scored");
            }
            openRoundUnlocked(session, slide, true);
        });
    }

    /**
     * Shared open/reopen path, <strong>lock-free</strong>: the caller must already
     * hold the session lock. Operates on an already-resolved session + slide so a
     * navigation caller ({@link #advance}/{@link #goTo}) can resolve the next slide
     * and open it under one lock — {@link SessionLocks} is not reentrant, so opening
     * could not take its own lock. Clears the round's tally (and answers on a
     * restart), saves the fresh {@link LiveRoundState}, and publishes the event for
     * the phase entered: {@code RoundRestarted} on a restart, else
     * {@code LiveResultsShown} (opened live) or {@code RoundStarted} (opened hidden).
     *
     * @return the slide the round opened on
     */
    private Slide openRoundUnlocked(LiveSession session, Slide slide, boolean restart) {
        String sessionId = session.getId();
        String slideId = slide.getId();
        RoundPhase phase = initialPhaseFor(session, slide);
        LiveRoundState current = roundStateStore.load(sessionId)
                .orElseGet(() -> LiveRoundState.idle(session.getPublicId()));
        tallyStore.clear(sessionId, slideId);
        if (restart) {
            answerStore.clear(sessionId, slideId);
        }
        LiveRoundState started = current.startedRound(slideId, Instant.now(), phase);
        roundStateStore.save(sessionId, started);
        Settings.AnswerSettings effectiveAnswer =
                Settings.effectiveAnswerSettings(session.getDeck().getSettings(), slide.getSettings());
        SessionEvent event;
        if (restart) {
            event = SessionEvents.roundRestarted(slideId, phase, started.roundStartedAt());
        } else if (phase == RoundPhase.SUBMIT_LIVE) {
            event = SessionEvents.liveResultsShown(started, slide, tallyStore.tally(sessionId, slideId), effectiveAnswer);
        } else {
            event = SessionEvents.roundStarted(started, slide, effectiveAnswer);
        }
        publisher.publish(session.getPublicId(), event);
        return slide;
    }

    /**
     * F4 guard: rejects opening a <em>different</em> slide while the current round is
     * still accepting submissions. Same-slide re-open and opening after a round has
     * closed both pass. Must be called under the session lock.
     */
    private void requireRoundOpenable(String sessionId, String slideId) {
        roundStateStore.load(sessionId).ifPresent(current -> {
            if (current.currentSlideId() != null
                    && current.phase().acceptsSubmissions()
                    && !slideId.equals(current.currentSlideId())) {
                throw new ConflictException("ROUND_ALREADY_OPEN",
                        "a round is already open on another slide");
            }
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
        return locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            LiveRoundState state = roundStateStore.load(sessionId).orElse(null);
            String currentSlideId = state == null ? null : state.currentSlideId();
            Slide next = resolveNextSlide(session, currentSlideId);
            if (next == null) {
                return null; // snapshot exhausted — terminal (the podium cue rides the last ResultsRevealed)
            }
            return openRoundUnlocked(session, next, false);
        });
    }

    /**
     * Opens a specific slide by host request: validates {@code slideId} against the
     * deck snapshot (rather than trusting the client), rejects opening an attached
     * follow-up child before its parent has been scored (open-decisions B3), applies
     * the F4 guard, then opens it as a round.
     */
    public void goTo(String sessionId, String slideId) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        locks.withLock(sessionId, () -> {
            Deck deck = session.getDeck();
            if (deck.isAttachedFollowUp(slide)
                    && roundResults.find(sessionId, slide.getParentId()).isEmpty()) {
                throw new ConflictException("PARENT_ROUND_NOT_SCORED",
                        "a follow-up child cannot open before its parent round is scored");
            }
            requireRoundOpenable(sessionId, slideId);
            openRoundUnlocked(session, slide, false);
        });
    }

    /**
     * The slide that follows {@code currentSlideId} in the deck snapshot's sorted
     * order, or the first slide when no round has opened yet, or {@code null} when
     * the snapshot is exhausted. Because {@code Deck.addFollowUp} places a child
     * immediately after its parent, plain "next in sorted order" already yields the
     * parent→child step and then the slide after the child (open-decisions B3).
     */
    private Slide resolveNextSlide(LiveSession session, String currentSlideId) {
        List<Slide> ordered = session.getDeck().getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
        if (ordered.isEmpty()) {
            return null;
        }
        if (currentSlideId == null) {
            return ordered.get(0);
        }
        for (int i = 0; i < ordered.size(); i++) {
            if (currentSlideId.equals(ordered.get(i).getId())) {
                return i + 1 < ordered.size() ? ordered.get(i + 1) : null;
            }
        }
        // Current slide not found in the snapshot (shouldn't happen) — start over.
        return ordered.get(0);
    }

    /** Whether {@code slideId} is the last slide of the deck snapshot's sorted order. */
    private boolean isLastRound(LiveSession session, String slideId) {
        List<Slide> ordered = session.getDeck().getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
        return !ordered.isEmpty() && slideId.equals(ordered.get(ordered.size() - 1).getId());
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

    /** Resolves a slide from the session's deck snapshot, never trusting a client id. */
    private Slide requireSlide(LiveSession session, String slideId) {
        return session.getDeck().findSlide(slideId)
                .orElseThrow(() -> new NotFoundException("SLIDE_NOT_FOUND", "slide not in deck snapshot"));
    }

    /**
     * The {@link Settings.PointSettings} in effect for a slide: its per-slide
     * override if present, else the deck defaults, else {@link #NO_POINTS} (so an
     * unconfigured slide still scores as zero rather than NPEing in the scorer).
     */
    private Settings.PointSettings resolvePoints(LiveSession session, Slide slide) {
        Settings.DeckSettings deckSettings = session.getDeck().getSettings();
        Settings.PointSettings deckDefaults = deckSettings == null ? null : deckSettings.pointSettings();
        Settings.SlideSettings slideSettings = slide.getSettings();
        Settings.PointSettings resolved =
                slideSettings == null ? deckDefaults : slideSettings.resolvePoints(deckDefaults);
        return resolved != null ? resolved : NO_POINTS;
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
