package com.cephadex.ambi.session;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.stereotype.Service;

import com.cephadex.ambi.common.exception.ConflictException;
import com.cephadex.ambi.common.exception.ForbiddenException;
import com.cephadex.ambi.common.exception.NotFoundException;
import com.cephadex.ambi.common.redis.RedisJsonCodec;
import com.cephadex.ambi.media.AppImage;
import com.cephadex.ambi.media.enums.ImageSizeOptions;
import com.cephadex.ambi.media.storage.ImageKeys;
import com.cephadex.ambi.media.storage.ImageUrlResolver;
import com.cephadex.ambi.media.storage.OpaqueImageUrls;
import com.cephadex.ambi.media.storage.S3StorageService;
import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.presentation.deck.Settings;
import com.cephadex.ambi.presentation.deck.enums.ResultsDisplayMode;
import com.cephadex.ambi.presentation.slide.Slide;
import com.cephadex.ambi.presentation.slide.content.AllocationContent;
import com.cephadex.ambi.presentation.slide.content.DrawingContent;
import com.cephadex.ambi.presentation.slide.content.FollowUpContent;
import com.cephadex.ambi.presentation.slide.content.PlaceOnImageContent;
import com.cephadex.ambi.presentation.slide.SlideRankService;
import com.cephadex.ambi.presentation.slide.enums.FollowUpMode;
import com.cephadex.ambi.session.answer.Answer;
import com.cephadex.ambi.session.answer.payload.AnswerPayload;
import com.cephadex.ambi.session.answer.payload.DrawingAnswer;
import com.cephadex.ambi.session.answer.payload.AnswerTallyKeys;
import com.cephadex.ambi.session.answer.payload.NumberAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAAnswer;
import com.cephadex.ambi.session.answer.payload.QAndAQuestions;
import com.cephadex.ambi.session.answer.payload.TextAnswer;
import com.cephadex.ambi.session.event.EventPublisher;
import com.cephadex.ambi.session.event.SessionEvent;
import com.cephadex.ambi.session.event.SessionEvents;
import com.cephadex.ambi.session.event.dto.AllocationTargetView;
import com.cephadex.ambi.session.event.dto.DrawingSubmissionView;
import com.cephadex.ambi.session.event.dto.FollowUpConfigView;
import com.cephadex.ambi.session.event.dto.PlaceTargetView;
import com.cephadex.ambi.session.event.dto.QAndAQuestionView;
import com.cephadex.ambi.session.event.dto.VoteOptionView;
import com.cephadex.ambi.session.followUp.FollowUpOption;
import com.cephadex.ambi.session.followUp.FollowUpOptionSet;
import com.cephadex.ambi.session.followUp.FollowUpOptions;
import com.cephadex.ambi.session.liveSession.LiveSession;
import com.cephadex.ambi.session.liveSession.LiveSessionRepository;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;
import com.cephadex.ambi.session.participant.Participant;
import com.cephadex.ambi.session.participant.ParticipantRepository;
import com.cephadex.ambi.session.participant.enums.ConnectionStatus;
import com.cephadex.ambi.session.redis.AnswerStore;
import com.cephadex.ambi.session.redis.DeadlineStore;
import com.cephadex.ambi.session.redis.FollowUpOptionStore;
import com.cephadex.ambi.session.redis.LiveRoundState;
import com.cephadex.ambi.session.redis.LiveRoundStateStore;
import com.cephadex.ambi.session.redis.Presence;
import com.cephadex.ambi.session.redis.PresenceStore;
import com.cephadex.ambi.session.redis.QAndAHostAnswerStore;
import com.cephadex.ambi.session.redis.SessionDeadline;
import com.cephadex.ambi.session.redis.SessionLocks;
import com.cephadex.ambi.session.redis.SessionRedisProperties;
import com.cephadex.ambi.session.redis.TallyStore;
import com.cephadex.ambi.session.redis.VoteOption;
import com.cephadex.ambi.session.redis.VoteStore;
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
 * <p>A round has no durable document and no identity beyond
 * {@code (sessionId, slideId)}, so its transitions live here rather than in a
 * separate Round object (open-decisions B1).
 *
 * <h2>Round phases</h2>
 * A standalone slide runs {@code SUBMIT → REVEAL_RESPONSES → REVEAL_RESULTS}. A
 * follow-up child is a <strong>regular round of its own</strong> — same
 * {@code SUBMIT → … → REVEAL_RESULTS} run, with the candidates minted from its
 * parent's submissions when it opens and the participant's pick travelling the
 * ordinary answer path. Its parent therefore stops at
 * {@code SUBMIT → REVEAL_RESPONSES} and advances into the child without ever
 * revealing: a reveal on a parent is rejected
 * ({@code REVEAL_BLOCKED_BY_FOLLOW_UP}), because the follow-up round is where the
 * parent's results are presented. Whether a round is a follow-up is resolved
 * statelessly from the deck snapshot's validated link ({@link Deck#isAttachedFollowUp})
 * — nothing extra is carried in {@link LiveRoundState}. The separate {@code VOTE}
 * phase is unrelated: a best-answer/deception round runs
 * {@code SUBMIT → VOTE → REVEAL_RESULTS} (D3), where {@link #openVoting} closes
 * submissions <em>without scoring</em> and collects votes on the round's own
 * free-text submissions, which fold into the scoring that then runs on the reveal
 * transition.
 *
 * <p><strong>Status:</strong> the full orchestrator surface is wired — session
 * lifecycle, roster, presence/reconnect, the round lifecycle (open → close+score →
 * reveal), best-answer/deception voting (D3), server-owned navigation including
 * the follow-up auto-skip, and the auto-close round timers of ADR 002 (deadlines
 * in a Redis ZSET drained by {@link DeadlineScheduler}, pause/resume, and the
 * host-disconnect grace policy). The one remaining deferred seam (combined
 * follow-up reveal, B3) is noted at its call site in {@link #revealResults}.
 */
@Service
public class LiveSessionOrchestrator {

    private static final Logger log = LoggerFactory.getLogger(LiveSessionOrchestrator.class);

    private final LiveSessionRepository repo;
    private final ParticipantRepository participants;
    private final SessionLocks locks;
    private final LiveRoundStateStore roundStateStore;
    private final AnswerStore answerStore;
    private final TallyStore tallyStore;
    private final VoteStore voteStore;
    private final PresenceStore presenceStore;
    private final QAndAHostAnswerStore qandaHostAnswers;
    private final FollowUpOptionStore followUpOptions;
    private final EventPublisher publisher;
    private final RoundResultProjector roundResults;
    private final ImageUrlResolver imageUrls;
    private final OpaqueImageUrls opaqueImageUrls;
    private final S3StorageService storage;
    private final RedisJsonCodec codec;
    private final DeadlineStore deadlines;
    private final SessionRedisProperties redisProps;

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

    /**
     * Roster cap when the deck's {@link Settings.AudienceSettings#maxParticipants()}
     * is unset (F5). Generous enough for any classroom/party run; a deck that needs
     * more sets its own limit.
     */
    private static final int DEFAULT_MAX_PARTICIPANTS = 200;

    /**
     * Snapshot-size warning threshold (F3): half of Mongo's 16MB document limit.
     * The deck snapshot is the only unbounded part of the session document, so a
     * snapshot past this size deserves a log line long before the hard limit bites.
     */
    private static final int SNAPSHOT_WARN_BYTES = 8 * 1024 * 1024;

    public LiveSessionOrchestrator(LiveSessionRepository repo, ParticipantRepository participants,
            SessionLocks locks, LiveRoundStateStore roundStateStore, AnswerStore answerStore, TallyStore tallyStore,
            VoteStore voteStore, PresenceStore presenceStore, QAndAHostAnswerStore qandaHostAnswers,
            FollowUpOptionStore followUpOptions, EventPublisher publisher, RoundResultProjector roundResults,
            ImageUrlResolver imageUrls, OpaqueImageUrls opaqueImageUrls, S3StorageService storage,
            RedisJsonCodec codec, DeadlineStore deadlines, SessionRedisProperties redisProps) {
        this.repo = repo;
        this.participants = participants;
        this.locks = locks;
        this.roundStateStore = roundStateStore;
        this.answerStore = answerStore;
        this.tallyStore = tallyStore;
        this.voteStore = voteStore;
        this.presenceStore = presenceStore;
        this.qandaHostAnswers = qandaHostAnswers;
        this.followUpOptions = followUpOptions;
        this.publisher = publisher;
        this.roundResults = roundResults;
        this.imageUrls = imageUrls;
        this.opaqueImageUrls = opaqueImageUrls;
        this.storage = storage;
        this.codec = codec;
        this.deadlines = deadlines;
        this.redisProps = redisProps;
    }

    /**
     * Resolves a slide item's image to the URL carried on the round's
     * {@code SlideView} (see {@code MatchingConfigView} for why images travel
     * pre-resolved). MD suits a board card face; smaller tiers would blur on a
     * projected board.
     */
    private String slideItemImageUrl(AppImage image) {
        return imageUrls.displayUrl(image, ImageSizeOptions.MD);
    }

    /**
     * Resolves a follow-up candidate's image to the URL its board renders — LG,
     * the same tier {@link #votableOption} and {@link #drawingSubmissions} use,
     * because a candidate minted from a drawing is the submitted drawing itself
     * and the follow-up board projects.
     *
     * <p><strong>Opaque, not presigned.</strong> A presigned URL is path-style,
     * so it spells its object's key out — {@code drawing/{sessionId}/…} for a
     * submission, {@code gallery/{uuid}/…} for an authored image. A
     * {@code SPOT_THE_ANSWER} board mixes the two on purpose, so a URL that
     * names its namespace hands the seeded answer to anyone reading devtools —
     * and it is no use proxying only the seed, since being the one proxied card
     * is the same tell. Every candidate image therefore goes out as a signed
     * {@link OpaqueImageUrls} token instead, indistinguishable from the next.
     * That also outlives the presigner: these URLs are frozen into the 6h
     * {@code FollowUpOptionStore} snapshot, which a 1h presigned URL would go
     * dead inside of. An <em>external</em> image (an authored MCQ option
     * pointing at someone else's origin) owns no stored object to proxy, so it
     * passes through as it always did.
     */
    private String followUpCandidateImageUrl(AppImage image) {
        String key = imageUrls.displayKey(image, ImageSizeOptions.LG);
        return key == null ? imageUrls.displayUrl(image, ImageSizeOptions.LG) : opaqueImageUrls.url(key);
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
        warnIfSnapshotLarge(session);
        return session;
    }

    /**
     * F3 guard: logs when the deck snapshot serializes past
     * {@link #SNAPSHOT_WARN_BYTES}, the early signal before a run ever nears
     * Mongo's 16MB document limit. Best-effort — sizing must never fail a
     * successfully created session.
     */
    private void warnIfSnapshotLarge(LiveSession session) {
        try {
            // RedisJsonCodec is nominally the Redis-value codec; it's reused here
            // purely as a configured mapper to estimate the Mongo document's size.
            String json = codec.serialize(session.getDeck());
            int bytes = json == null ? 0 : json.getBytes(StandardCharsets.UTF_8).length;
            if (bytes > SNAPSHOT_WARN_BYTES) {
                log.warn("Deck snapshot for session {} serializes to {} bytes — approaching Mongo's 16MB document limit",
                        session.getId(), bytes);
            }
        } catch (RuntimeException e) {
            log.debug("Could not size the deck snapshot for session {}", session.getId(), e);
        }
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
            cancelUnlocked(session, "Cancelled by host");
        });
    }

    /**
     * The cancel transition itself, <strong>lock-free</strong>: the caller must
     * already hold the session lock ({@link SessionLocks} is not reentrant).
     * Shared by {@link #cancelSession} and the host-disconnect grace expiry
     * ({@link #hostGraceExpired}), which differ only in their guard and reason.
     */
    private void cancelUnlocked(LiveSession session, String reason) {
        session.cancel();
        repo.save(session);
        clearSessionRedis(session);
        publisher.publish(session.getPublicId(), SessionEvents.liveSessionCancelled(reason));
    }

    // ── Participants & presence ──────────────────────────────────────────────

    /**
     * Joins a participant via the room code (public join; guests allowed): resolves
     * the live session, creates the {@link Participant#join} record, adds it to the
     * roster, seeds presence, persists, and publishes the roster change. An unknown
     * or terminal room code is masked as a 404 (the code is a guessable key).
     *
     * <p>The roster mutation runs under the session lock so two concurrent joins
     * can't lose an update or race past the roster cap (F5): a session at the
     * deck's {@link Settings.AudienceSettings#maxParticipants()} (or
     * {@link #DEFAULT_MAX_PARTICIPANTS} when unset) rejects further joins.
     *
     * @param roomCode    the human-typed room code (also the link-join code)
     * @param userId      the joining user's id (a minted guest id for guests)
     * @param displayName required display name shown to other players
     * @param avatar      optional avatar
     * @param colorTag    optional color tag
     * @return the joined session (for its publicId) and the new participant
     * @throws ConflictException if the session is already at its participant limit
     */
    public JoinResult join(String roomCode, String userId, String displayName, Avatar avatar, String colorTag) {
        LiveSession found = repo.findByRoomCode(roomCode)
                .filter(candidate -> !candidate.isTerminal())
                .orElseThrow(() -> new NotFoundException("SESSION_NOT_FOUND", "session not found"));

        Participant participant = Participant.join(userId, displayName, avatar, colorTag);

        return locks.withLock(found.getId(), () -> {
            LiveSession session = requireSession(found.getId());
            if (session.isTerminal()) {
                throw new NotFoundException("SESSION_NOT_FOUND", "session not found");
            }
            if (session.participantCount() >= maxParticipants(session)) {
                throw new ConflictException("SESSION_FULL",
                        "this session has reached its participant limit");
            }
            participants.save(participant);
            session.addParticipant(participant.getParticipantId());
            repo.save(session);
            presenceStore.save(session.getId(), participant.getParticipantId(), Presence.online(Instant.now()));

            publisher.publish(session.getPublicId(),
                    SessionEvents.participantJoined(participant, session.getRoster()));
            return new JoinResult(session, participant);
        });
    }

    /**
     * The roster cap in effect for a session: the deck's
     * {@code AudienceSettings.maxParticipants} when set (&gt; 0), else
     * {@link #DEFAULT_MAX_PARTICIPANTS}.
     */
    private int maxParticipants(LiveSession session) {
        Settings.DeckSettings settings = session.getDeck() == null ? null : session.getDeck().getSettings();
        Settings.AudienceSettings audience = settings == null ? null : settings.audienceSettings();
        return audience != null && audience.maxParticipants() > 0
                ? audience.maxParticipants()
                : DEFAULT_MAX_PARTICIPANTS;
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
        Instant now = Instant.now();
        presenceStore.save(sessionId, participantId, Presence.online(now));
        if (session.isHost(participantId)) {
            armHostLiveness(sessionId, now);
            resumeAutoPausedRound(sessionId);
        }
        publisher.publish(session.getPublicId(), SessionEvents.participantReconnected(participant));
        return participant;
    }

    /**
     * Records a liveness heartbeat: refreshes the participant's presence /
     * last-seen. Server-debounced (ignore more than ~1/sec per participant — F5).
     * Does not publish (presence is read on demand for the lobby/scoreboard).
     *
     * <p>{@code host} is resolved by the caller (which already holds the session to
     * authorize the beat): a host beat also re-arms the host-liveness deadline that
     * drives the disconnect policy (F5 / ADR 002).
     */
    public void heartbeat(String sessionId, String participantId, boolean host) {
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
        if (host) {
            armHostLiveness(sessionId, now);
            resumeAutoPausedRound(sessionId);
        }
    }

    /**
     * (Re-)arms the host-liveness deadline off a host presence write (F5 / ADR
     * 002): the {@code HOST_AWAY} entry moves {@code hostOfflineAfter} past the
     * beat, and any pending grace-cancel is called off — the host is back.
     * Callers on the unlocked presence paths pair this with
     * {@link #resumeAutoPausedRound}; callers already inside the session lock
     * use {@link #resumeAutoPausedRoundUnlocked} directly.
     */
    private void armHostLiveness(String sessionId, Instant seenAt) {
        deadlines.schedule(SessionDeadline.hostAway(sessionId),
                seenAt.plus(redisProps.getDeadlines().getHostOfflineAfter()));
        deadlines.cancel(SessionDeadline.graceCancel(sessionId));
    }

    /**
     * Resumes a round auto-paused by {@link #hostPresenceLost} now that the host
     * is provably back — the disconnect pause self-heals rather than waiting on
     * a manual resume. This also repairs the race where an unlocked host beat
     * lands inside {@code hostPresenceLost}'s locked section and gets clobbered:
     * the next beat comes through here and undoes the spurious pause. A
     * deliberate host pause ({@code autoPaused == false}) is never touched.
     *
     * <p>Called from the unlocked presence paths, so it takes the session lock
     * itself (after a cheap lock-free pre-check that skips the overwhelmingly
     * common no-auto-pause case). A busy lock is skipped, not surfaced — the
     * next beat retries.
     */
    private void resumeAutoPausedRound(String sessionId) {
        LiveRoundState glance = roundStateStore.load(sessionId).orElse(null);
        if (glance == null || !glance.autoPaused()) {
            return;
        }
        try {
            locks.withLock(sessionId, () -> resumeAutoPausedRoundUnlocked(sessionId));
        } catch (ConflictException busy) {
            // A concurrent operation holds the session; the next beat will retry.
        }
    }

    /** The auto-resume transition itself; the caller must hold the session lock. */
    private void resumeAutoPausedRoundUnlocked(String sessionId) {
        LiveRoundState current = roundStateStore.load(sessionId).orElse(null);
        if (current == null || !current.autoPaused() || !current.isPaused()
                || current.currentSlideId() == null || !current.phase().acceptsSubmissions()) {
            return;
        }
        LiveRoundState resumed = current.resumed(Instant.now());
        roundStateStore.save(sessionId, resumed);
        deadlines.schedule(SessionDeadline.closeRound(sessionId, current.currentSlideId()),
                resumed.deadline());
        if (resumed.publicId() != null) {
            publisher.publish(resumed.publicId(), SessionEvents.timerResumed(resumed));
        }
    }

    /**
     * Fired by the {@code DeadlineScheduler} when the host's liveness deadline
     * lapses (F5 / ADR 002). Re-validates presence under the session lock — a
     * fresh beat may have raced the firing, in which case the deadline is simply
     * re-armed. On a genuine loss: the open timed round auto-pauses (flagged
     * {@code autoPaused}, unlike a deliberate {@link #pauseTimer}), the host's
     * presence flips to {@code DISCONNECTED} and is broadcast, and the
     * grace-cancel countdown starts. If the host returns before it fires, any
     * presence write calls the grace off and auto-resumes the paused round
     * ({@link #armHostLiveness} + {@link #resumeAutoPausedRound}); otherwise
     * {@link #hostGraceExpired} cancels the session.
     */
    public void hostPresenceLost(String sessionId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            if (session.isTerminal()) {
                return; // ended while the deadline was in flight — nothing to do
            }
            String hostId = session.getHostParticipantId();
            Instant now = Instant.now();
            Duration offlineAfter = redisProps.getDeadlines().getHostOfflineAfter();
            Presence presence = presenceStore.find(sessionId, hostId).orElse(null);
            Instant lastSeen = presence == null ? null : presence.lastSeenAt();
            if (lastSeen != null && Duration.between(lastSeen, now).compareTo(offlineAfter) < 0) {
                // False alarm — a beat raced the firing. Re-arm from the actual beat
                // and undo any auto-pause a previous episode left behind.
                armHostLiveness(sessionId, lastSeen);
                resumeAutoPausedRoundUnlocked(sessionId);
                return;
            }

            LiveRoundState current = roundStateStore.load(sessionId).orElse(null);
            if (current != null && current.currentSlideId() != null && current.phase().acceptsSubmissions()
                    && current.timed() && !current.isPaused()) {
                LiveRoundState paused = current.pausedByHostLoss(now);
                roundStateStore.save(sessionId, paused);
                deadlines.cancel(SessionDeadline.closeRound(sessionId, current.currentSlideId()));
                if (paused.publicId() != null) {
                    publisher.publish(paused.publicId(), SessionEvents.timerPaused(paused));
                }
            }

            Presence offline = new Presence(ConnectionStatus.DISCONNECTED, lastSeen);
            presenceStore.save(sessionId, hostId, offline);
            publisher.publish(session.getPublicId(), SessionEvents.presenceChanged(hostId, offline));
            deadlines.schedule(SessionDeadline.graceCancel(sessionId),
                    now.plus(redisProps.getDeadlines().getHostGrace()));
        });
    }

    /**
     * Fired by the {@code DeadlineScheduler} when a disconnected host's grace runs
     * out (F5 / ADR 002): the session is cancelled — unless the host slipped back
     * in (a presence write should already have called this off; re-validated here
     * anyway), in which case the liveness watch simply re-arms.
     */
    public void hostGraceExpired(String sessionId) {
        locks.withLock(sessionId, () -> {
            LiveSession session = requireSession(sessionId);
            if (session.isTerminal()) {
                return;
            }
            Presence presence = presenceStore.find(sessionId, session.getHostParticipantId()).orElse(null);
            Instant lastSeen = presence == null ? null : presence.lastSeenAt();
            if (lastSeen != null && Duration.between(lastSeen, Instant.now())
                    .compareTo(redisProps.getDeadlines().getHostOfflineAfter()) < 0) {
                armHostLiveness(sessionId, lastSeen);
                resumeAutoPausedRoundUnlocked(sessionId);
                return;
            }
            cancelUnlocked(session, "Host disconnected");
        });
    }

    // ── Round control ────────────────────────────────────────────────────────

    /**
     * Opens {@code slideId} for submissions, clearing any prior round's tallies
     * and answers.
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

        // The overwrite has landed; now drop the superseded drawing's S3 objects
        // so unlimited "update drawing" cycles can't grow storage unbounded
        // (delete-on-remove, like GalleryService). Deleting only AFTER the write
        // means a rejected or failed resubmit can never strand the still-current
        // answer pointing at dead objects.
        prior.ifPresent(p -> deleteReplacedDrawing(p.getPayload(), payload));

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
     * Records one Q&amp;A question for the open round. Q&amp;A departs from the
     * one-answer-per-participant model the other kinds share: a player may ask
     * several questions, so the incoming {@link QAndAAnswer} is <em>appended</em>
     * to the participant's stored {@link QAndAQuestions} aggregate (still one
     * {@code Answer} per participant, so scoring and the durable flush keep their
     * shape) with a server-assigned question id. Publishes the full
     * {@code QAndAUpdated} list. Lock-free like {@link #submitAnswer}: the
     * read-modify-write races only against the same participant's own concurrent
     * submissions (one device in practice), never across participants.
     *
     * @param maxResponses per-participant question cap from the slide's
     *                     {@code QAndAContent}; {@code null} or {@code 0} = unlimited
     * @param anonymize    the round's {@code anonymizeAnswers} answer setting — when
     *                     set, published views carry no {@code participantId}
     * @throws ConflictException if no round is open for {@code slideId}, it is no
     *                           longer accepting submissions, or the participant
     *                           reached the question cap
     */
    public void submitQuestion(String sessionId, String slideId, String participantId,
            QAndAAnswer payload, Integer maxResponses, boolean anonymize) {
        LiveRoundState state = roundStateStore.load(sessionId).orElse(null);
        if (state == null || !slideId.equals(state.currentSlideId()) || !state.phase().acceptsSubmissions()) {
            throw new ConflictException("ROUND_NOT_OPEN", "this slide is not accepting submissions");
        }

        List<QAndAQuestions.QuestionEntry> entries = new ArrayList<>(
                answerStore.answerOf(sessionId, slideId, participantId)
                        .map(prior -> prior.getPayload())
                        .filter(QAndAQuestions.class::isInstance)
                        .map(prior -> ((QAndAQuestions) prior).questions())
                        .orElse(List.of()));
        if (maxResponses != null && maxResponses > 0 && entries.size() >= maxResponses) {
            throw new ConflictException("QUESTION_LIMIT_REACHED",
                    "you have reached this round's question limit");
        }
        entries.add(new QAndAQuestions.QuestionEntry(
                UUID.randomUUID().toString(), payload.question().strip(), Instant.now()));

        Answer answer = new Answer();
        answer.setParticipantId(participantId);
        answer.setSessionId(sessionId);
        answer.setSlideId(slideId);
        answer.setSubmittedAt(Instant.now());
        answer.setPayload(new QAndAQuestions(List.copyOf(entries)));
        answerStore.submit(sessionId, slideId, answer);

        publishQAndAUpdated(state.publicId(), sessionId, slideId, anonymize);
    }

    /**
     * Records (or clears) the host's typed answer next to a Q&amp;A question and
     * broadcasts the updated list. A blank {@code answerText} clears the answer —
     * the host's "undo". Allowed in any phase while the session is live (the host
     * may keep answering after submissions close); the question must exist in the
     * round's stored answers.
     *
     * @throws NotFoundException if the slide isn't in the deck snapshot or no
     *                           question with {@code questionId} was asked this round
     */
    public void answerQuestion(String sessionId, String slideId, String questionId, String answerText) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        boolean exists = answerStore.answers(sessionId, slideId).stream()
                .anyMatch(a -> a.getPayload() instanceof QAndAQuestions questions
                        && questions.questions() != null
                        && questions.questions().stream().anyMatch(e -> questionId.equals(e.id())));
        if (!exists) {
            throw new NotFoundException("QUESTION_NOT_FOUND", "no such question in this round");
        }

        if (answerText == null || answerText.isBlank()) {
            qandaHostAnswers.remove(sessionId, slideId, questionId);
        } else {
            qandaHostAnswers.put(sessionId, slideId, questionId, answerText.strip());
        }

        Settings.AnswerSettings effective =
                Settings.effectiveAnswerSettings(session.getDeck().getSettings(), slide.getSettings());
        boolean anonymize = effective != null && effective.anonymizeAnswers();
        publishQAndAUpdated(session.getPublicId(), sessionId, slideId, anonymize);
    }

    /** Assembles and broadcasts the round's current participant-safe Q&amp;A question list. */
    private void publishQAndAUpdated(String publicId, String sessionId, String slideId, boolean anonymize) {
        if (publicId == null) {
            return;
        }
        List<QAndAQuestionView> questions = QAndAQuestionView.from(
                answerStore.answers(sessionId, slideId),
                qandaHostAnswers.all(sessionId, slideId),
                anonymize);
        publisher.publish(publicId, SessionEvents.qAndAUpdated(slideId, questions));
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
     *
     * <p>Also the expiry path of a timed round (ADR 002): the
     * {@code DeadlineScheduler} calls this exact method when the round's deadline
     * fires. {@code slideId} must match the open round — a close for any other
     * slide (a stale timer firing after the host moved on) is a no-op — and any
     * pending auto-close deadline for the round is cancelled either way.
     */
    public void closeSubmissions(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            if (!slideId.equals(current.currentSlideId())) {
                return; // stale close (a timer firing after the host moved on) — never touch another round
            }
            deadlines.cancel(SessionDeadline.closeRound(sessionId, slideId));
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
            // data stays readable through reveal; it clears on (re)open/session end.
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
     * Closes submissions on the current round <strong>without scoring it</strong>
     * and opens best-answer voting on the anonymised submissions (D3):
     * {@code SUBMIT/SUBMIT_LIVE → VOTE}. Scoring must wait for the votes — the
     * round is scored on the {@code VOTE → REVEAL_RESULTS} transition
     * ({@link #revealResults}), where the tallies fold into
     * {@code bestAnswer}/{@code deceivedCount}. Because a round closed the normal
     * way is scored immediately, voting can only open <em>from an open round</em>;
     * on a timed round the host must open voting before the auto-close fires.
     * Idempotent if voting is already open.
     *
     * <p>Each votable submission is minted an opaque option id; the id→author
     * mapping stays in {@link VoteStore}, and the published
     * {@link VoteOptionView}s carry only the id and an anonymous preview (text, or
     * a presigned drawing URL), so clients can't tell whose answer an option is.
     * Cancels any pending auto-close deadline — voting supersedes the timer.
     *
     * @throws ConflictException if no round is open for {@code slideId}, it has
     *                           already closed (and thus scored), or no submission
     *                           can be voted on
     */
    public void openVoting(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = roundStateStore.load(sessionId).orElse(null);
            if (current == null || !slideId.equals(current.currentSlideId())) {
                throw new ConflictException("ROUND_NOT_OPEN", "this slide has no open round");
            }
            if (current.phase().acceptsVotes()) {
                return; // voting already open — idempotent
            }
            if (current.phase().isClosed()) {
                throw new ConflictException("ROUND_ALREADY_CLOSED",
                        "voting must open while submissions are open — this round is already scored");
            }

            Map<String, VoteOption> options = new HashMap<>();
            for (Answer answer : answerStore.answers(sessionId, slideId)) {
                VoteOption option = votableOption(answer);
                if (option != null) {
                    options.put(UUID.randomUUID().toString(), option);
                }
            }
            if (options.isEmpty()) {
                throw new ConflictException("NO_VOTABLE_SUBMISSIONS",
                        "no submission of this round can be voted on");
            }
            voteStore.clear(sessionId, slideId);
            voteStore.saveOptions(sessionId, slideId, options);

            roundStateStore.save(sessionId, current.withPhase(RoundPhase.VOTE));
            deadlines.cancel(SessionDeadline.closeRound(sessionId, slideId));

            if (current.publicId() != null) {
                publisher.publish(current.publicId(),
                        SessionEvents.votingOpened(slideId, VoteOptionView.from(options)));
            }
        });
    }

    /**
     * Records {@code participantId}'s vote for the open voting round: resolves the
     * opaque option id through the server-side mapping, rejects self-votes, and
     * writes to {@link VoteStore} (a re-vote overwrites — last vote while voting
     * is open wins). Lock-free per vote by design, like {@link #submitAnswer}:
     * each is a single voter-keyed write. Publishes {@code VoteCast} with the
     * running number of votes cast — never per-option counts, which would sway
     * voters still deciding.
     *
     * @throws ConflictException   if no voting is open for {@code slideId}, or the
     *                             vote targets the caller's own submission
     * @throws NotFoundException   if {@code optionId} isn't one of the round's
     *                             minted options
     */
    public void submitVote(String sessionId, String slideId, String participantId, String optionId) {
        LiveRoundState state = roundStateStore.load(sessionId).orElse(null);
        if (state == null || !slideId.equals(state.currentSlideId()) || !state.phase().acceptsVotes()) {
            throw new ConflictException("VOTING_NOT_OPEN", "this slide is not collecting votes");
        }
        VoteOption option = voteStore.options(sessionId, slideId).get(optionId);
        if (option == null) {
            throw new NotFoundException("VOTE_OPTION_NOT_FOUND", "no such option in this round");
        }
        if (participantId.equals(option.authorParticipantId())) {
            throw new ConflictException("CANNOT_VOTE_FOR_OWN_ANSWER", "you cannot vote for your own answer");
        }
        voteStore.castVote(sessionId, slideId, participantId, optionId);

        if (state.publicId() != null) {
            publisher.publish(state.publicId(),
                    SessionEvents.voteCast(slideId, (int) voteStore.count(sessionId, slideId)));
        }
    }

    /**
     * The votable rendering of a submission, or {@code null} for the answer kinds
     * voting doesn't apply to. Votable are the free-form/creative payloads voting
     * exists to score (D3): free text, numbers, and drawings (as a presigned
     * image, LG like the results gallery — vote screens project).
     *
     * <p>A follow-up submission is deliberately absent: there the pick already
     * <em>is</em> the round's answer, so the VOTE phase must never open on top
     * of a follow-up board.
     */
    private VoteOption votableOption(Answer answer) {
        return switch (answer.getPayload()) {
            case TextAnswer text -> new VoteOption(answer.getParticipantId(), text.text(), null);
            case NumberAnswer number -> new VoteOption(answer.getParticipantId(),
                    String.valueOf(number.value()), null);
            case DrawingAnswer drawing -> drawing.image() == null ? null
                    : new VoteOption(answer.getParticipantId(), null,
                            imageUrls.displayUrl(drawing.image(), ImageSizeOptions.LG));
            default -> null;
        };
    }

    /**
     * Flushes the round's in-flight answers, scores them (grading + point awards
     * mutate the roster in memory), and persists the record + participants. Called
     * inside the session lock on the close transition — or on the results reveal
     * for a round that went through voting, so the vote tallies read here are
     * final (D3).
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
        // The board the round actually ran on, read back from its snapshot rather
        // than re-minted: it is both the answer key a SPOT_THE_ANSWER pick is
        // graded against and the only record of who authored which card, so
        // grading has to see exactly what the participants picked from.
        FollowUpOptionSet candidates = session.getDeck().isAttachedFollowUp(slide)
                ? followUpOptions.load(sessionId, slideId)
                : FollowUpOptionSet.empty();
        RoundResult result = RoundScorer.score(
                sessionId, slide, flushed, byId, points, votesReceived(sessionId, slideId),
                candidates, roundStartedAt, Instant.now());
        // byId values are the same objects as `roster`, so scoring mutated them.
        roundResults.persist(result, roster, flushed);
    }

    /**
     * The round's best-answer votes aggregated per answer <em>author</em> (the
     * shape {@link RoundScorer} folds into scoring), resolved through the
     * server-side option mapping. Empty for a round that never opened voting.
     */
    private Map<String, Integer> votesReceived(String sessionId, String slideId) {
        Map<String, VoteOption> options = voteStore.options(sessionId, slideId);
        if (options.isEmpty()) {
            return Map.of();
        }
        Map<String, Integer> byAuthor = new HashMap<>();
        for (String optionId : voteStore.votes(sessionId, slideId).values()) {
            VoteOption option = options.get(optionId);
            if (option != null) {
                byAuthor.merge(option.authorParticipantId(), 1, (a, b) -> a + b);
            }
        }
        return byAuthor;
    }

    /**
     * Shows the response distribution. While submissions are open this enables live
     * results ({@code SUBMIT → SUBMIT_LIVE}, publishes {@code LiveResultsShown});
     * after a hidden lock it reveals them ({@code LOCKED → REVEAL_RESPONSES},
     * publishes {@code ResponsesRevealed}). Idempotent — a no-op if responses are
     * already showing. Never exposes the answer key (that is results, and requires
     * {@link #revealResults}).
     *
     * @throws ConflictException if {@code slideId} is not the current round's slide;
     *                           a stale host call must not move another round's phase
     */
    public void revealResponses(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            // A stale or racing host call naming a slide the session has already left
            // would otherwise flip the CURRENT round's phase while publishing the other
            // slide's tally — same precondition revealResults applies. Checked ahead of
            // the idempotence short-circuit so a stale call still 409s rather than
            // passing silently, and an idle session (null currentSlideId) is rejected
            // too: there is no round to show responses for yet.
            if (!slideId.equals(current.currentSlideId())) {
                throw new ConflictException("ROUND_NOT_CURRENT", "this slide is not the current round");
            }

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
     * <p><strong>A parent with an attached follow-up is never taken to results</strong>
     * (open-decisions B3): its results are what the follow-up round presents, so a
     * reveal on the parent is rejected with {@code REVEAL_BLOCKED_BY_FOLLOW_UP}
     * before anything is written or published — the host closes the parent and
     * advances into the child instead.
     *
     * <p>Publishes the {@link RoundResult} already scored at close (this method never
     * re-scores). {@code terminal} is set when this is the last round of the deck
     * snapshot, the cue for the final podium.
     *
     * <p>Combined parent+child results for a follow-up round remain a seam: the
     * {@code resultsRevealed} factory takes a single record, so v1 publishes the
     * child's own result (open-decisions B3).
     *
     * <p>A round that closed with no persisted {@link RoundResult} (Redis round state
     * drifted from the results store) still publishes — an empty-payload
     * {@code ResultsRevealed} — so the phase change never lands silently.
     *
     * @throws ConflictException if {@code slideId} is not the current round's slide;
     *                           a stale host call must not move another round's phase
     */
    public void revealResults(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> roundStateStore.load(sessionId).ifPresent(current -> {
            // A stale or racing host call naming a slide the session has already left
            // would otherwise drive the CURRENT round to REVEAL_RESULTS while reading
            // the other slide's result — same precondition submitAnswer applies.
            if (!slideId.equals(current.currentSlideId())) {
                throw new ConflictException("ROUND_NOT_CURRENT", "this slide is not the current round");
            }

            // Resolved before anything is written: a session missing from Mongo while
            // its Redis round state survives must abort with no persisted transition,
            // rather than leaving REVEAL_RESULTS saved and no event published. The
            // current slide is already known to the deck snapshot (validated when the
            // round opened), so this is the last resolution here that can fail.
            LiveSession session = requireSession(sessionId);

            // A parent whose follow-up presents its results has no reveal of its own
            // (B3). Rejected here — after the round-match check, before any write or
            // publish — so a mis-clicked reveal leaves the round exactly as it was
            // and the host can close and advance into the child instead. The lookup
            // is tolerant (attachedFollowUp treats a null slide as unlinked): a slide
            // missing from the snapshot simply isn't a parent.
            Deck deck = session.getDeck();
            if (deck.attachedFollowUp(deck.findSlide(slideId).orElse(null)).isPresent()) {
                throw new ConflictException("REVEAL_BLOCKED_BY_FOLLOW_UP",
                        "this slide's results are shown by its follow-up round — close it and advance instead");
            }

            // Revealing results also closes an open round: score it once here, on
            // the transition out of the two not-yet-scored states — open, or VOTE
            // (a voting round defers scoring past the close so the final vote
            // tallies can fold in — D3). Saving REVEAL_RESULTS before scoring keeps
            // the answer key from ever showing while submissions are still open. A
            // round already closed at its own close is not re-scored (score-once).
            boolean unscored = !current.phase().isClosed() || current.phase().acceptsVotes();
            roundStateStore.save(sessionId, current.withPhase(RoundPhase.REVEAL_RESULTS));
            deadlines.cancel(SessionDeadline.closeRound(sessionId, slideId)); // revealing also consumes the timer
            if (unscored) {
                scoreAndPersistRound(sessionId, slideId, current.roundStartedAt());
            }

            // Read the result scored at close (or just now); publish it. Only an
            // unpublishable round (no routing id) bails out — a missing record means
            // the stores drifted, and the phase moved either way, so that case
            // publishes the transition with an empty payload rather than nothing.
            if (current.publicId() == null) {
                return;
            }
            RoundResult result = roundResults.find(sessionId, slideId).orElse(null);
            List<Participant> roster = participants.findAllById(session.getRoster());
            boolean terminal = isLastRound(session, slideId);
            SessionEvent event;
            if (result == null) {
                event = SessionEvents.resultsRevealedWithoutRecord(slideId, roster, terminal);
            } else {
                List<DrawingSubmissionView> drawings = drawingSubmissions(session, slideId, roster);
                List<PlaceTargetView> placeTargets = placeOnImageTargets(session, slideId);
                List<AllocationTargetView> allocationTargets = allocationTargets(session, slideId);
                event = SessionEvents.resultsRevealed(result, roster, drawings, placeTargets, allocationTargets,
                        terminal);
            }
            publisher.publish(current.publicId(), event);
        }));
    }

    /**
     * Deletes the S3 objects of a drawing the given resubmission just replaced
     * (no-ops unless both payloads are drawings and the image actually changed).
     * Best-effort: the overwrite has already landed, so a storage failure must
     * not fail the submit — an orphaned object is acceptable, a false 500 on a
     * durably-recorded answer is not.
     */
    private void deleteReplacedDrawing(AnswerPayload priorPayload, AnswerPayload nextPayload) {
        if (priorPayload instanceof DrawingAnswer previous && nextPayload instanceof DrawingAnswer next
                && previous.image() != null && previous.image().getSrcKey() != null
                && next.image() != null
                && !previous.image().getSrcKey().equals(next.image().getSrcKey())) {
            try {
                storage.delete(ImageKeys.allKeys(previous.image()));
            } catch (RuntimeException e) {
                log.warn("Could not delete replaced drawing objects under {} — leaving them orphaned",
                        previous.image().getSrcKey(), e);
            }
        }
    }

    /**
     * The submitted-drawings gallery for a Drawing round: every stored answer's
     * image resolved to a presigned URL, labelled with the submitter's display
     * name. {@code null} for every other slide kind, so the event field stays
     * absent. LG (960px bound) keeps 1024²-logical drawings crisp on a
     * projected results grid.
     */
    private List<DrawingSubmissionView> drawingSubmissions(LiveSession session, String slideId,
            List<Participant> roster) {
        // Tolerant lookup: the gallery is a bonus payload on an already-scored
        // reveal — a missing slide must not fail the whole reveal.
        Slide slide = session.getDeck() == null ? null
                : session.getDeck().findSlide(slideId).orElse(null);
        if (slide == null || !(slide.getContent() instanceof DrawingContent)) {
            return null;
        }
        Map<String, String> names = new HashMap<>();
        for (Participant participant : roster) {
            names.put(participant.getParticipantId(), participant.getDisplayName());
        }
        List<DrawingSubmissionView> drawings = new ArrayList<>();
        for (Answer answer : answerStore.answers(session.getId(), slideId)) {
            if (answer.getPayload() instanceof DrawingAnswer drawing && drawing.image() != null) {
                drawings.add(new DrawingSubmissionView(
                        answer.getParticipantId(),
                        names.get(answer.getParticipantId()),
                        imageUrls.displayUrl(drawing.image(), ImageSizeOptions.LG)));
            }
        }
        return drawings;
    }

    /**
     * The authored correct-location targets for a Place-on-image round, disclosed
     * at reveal so the board can draw the correct-location circles. {@code null}
     * for every other slide kind, so the event field stays absent. Derived purely
     * from the deck snapshot's slide content (no answer store), so it needs no
     * presigning and no roster.
     */
    private List<PlaceTargetView> placeOnImageTargets(LiveSession session, String slideId) {
        // Tolerant lookup, matching drawingSubmissions: the targets are a bonus
        // payload on an already-scored reveal — a missing slide must not fail it.
        Slide slide = session.getDeck() == null ? null
                : session.getDeck().findSlide(slideId).orElse(null);
        if (slide == null || !(slide.getContent() instanceof PlaceOnImageContent place)) {
            return null;
        }
        return PlaceTargetView.from(place);
    }

    /**
     * The authored per-option targets for an Allocation round, disclosed at reveal
     * so the board can mark the key. {@code null} for every other slide kind, so
     * the event field stays absent. Derived purely from the deck snapshot's slide
     * content, with the same tolerant lookup as {@code placeOnImageTargets}.
     */
    private List<AllocationTargetView> allocationTargets(LiveSession session, String slideId) {
        Slide slide = session.getDeck() == null ? null
                : session.getDeck().findSlide(slideId).orElse(null);
        if (slide == null || !(slide.getContent() instanceof AllocationContent allocation)) {
            return null;
        }
        return AllocationTargetView.from(allocation);
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
     * Pauses the open timed round's auto-close timer (ADR 002): stamps
     * {@code pausedAt}, removes the pending deadline, and publishes
     * {@code TimerPaused}. Submissions stay open — only the countdown freezes.
     * Idempotent if already paused.
     *
     * @throws ConflictException if no timed round is open on {@code slideId}
     */
    public void pauseTimer(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = requireOpenTimedRound(sessionId, slideId);
            if (current.isPaused()) {
                // Already paused. A host pause landing on a disconnect auto-pause
                // still means something: it converts the pause into a deliberate
                // one (same freeze, flag cleared) so a later host beat won't
                // auto-resume a round the host just chose to hold.
                if (current.autoPaused()) {
                    roundStateStore.save(sessionId, current.paused(current.pausedAt()));
                }
                return;
            }
            LiveRoundState paused = current.paused(Instant.now());
            roundStateStore.save(sessionId, paused);
            deadlines.cancel(SessionDeadline.closeRound(sessionId, slideId));
            if (paused.publicId() != null) {
                publisher.publish(paused.publicId(), SessionEvents.timerPaused(paused));
            }
        });
    }

    /**
     * Resumes a paused round timer (ADR 002): folds the elapsed pause into
     * {@code accumulatedPauseMs}, re-schedules the recomputed deadline, and
     * publishes {@code TimerResumed} carrying it. Idempotent if not paused.
     *
     * @throws ConflictException if no timed round is open on {@code slideId}
     */
    public void resumeTimer(String sessionId, String slideId) {
        locks.withLock(sessionId, () -> {
            LiveRoundState current = requireOpenTimedRound(sessionId, slideId);
            if (!current.isPaused()) {
                return; // already running — idempotent
            }
            LiveRoundState resumed = current.resumed(Instant.now());
            roundStateStore.save(sessionId, resumed);
            deadlines.schedule(SessionDeadline.closeRound(sessionId, slideId), resumed.deadline());
            if (resumed.publicId() != null) {
                publisher.publish(resumed.publicId(), SessionEvents.timerResumed(resumed));
            }
        });
    }

    /**
     * The open, submissions-accepting, timed round on {@code slideId} — the state
     * pause/resume operate on. Must be called under the session lock.
     */
    private LiveRoundState requireOpenTimedRound(String sessionId, String slideId) {
        LiveRoundState current = roundStateStore.load(sessionId).orElse(null);
        if (current == null || !slideId.equals(current.currentSlideId())
                || !current.phase().acceptsSubmissions()) {
            throw new ConflictException("ROUND_NOT_OPEN", "this slide has no open round");
        }
        if (!current.timed()) {
            throw new ConflictException("ROUND_NOT_TIMED", "this round has no timer");
        }
        return current;
    }

    /**
     * Shared open/reopen path, <strong>lock-free</strong>: the caller must already
     * hold the session lock. Operates on an already-resolved session + slide so a
     * navigation caller ({@link #advance}/{@link #goTo}) can resolve the next slide
     * and open it under one lock — {@link SessionLocks} is not reentrant, so opening
     * could not take its own lock. Clears the round's tally, votes, and answers so
     * every open — first, reopen, or restart — starts clean, saves the fresh
     * {@link LiveRoundState}, and publishes the event for
     * the phase entered: {@code RoundRestarted} on a restart, else
     * {@code LiveResultsShown} (opened live) or {@code RoundStarted} (opened hidden).
     *
     * <p>A follow-up round additionally snapshots its candidates here — minted
     * from the parent round's submissions and saved <em>before</em> the publish, so
     * the set the board votes on exists as soon as the round is announced. Opening
     * the other side of a pair (a parent that has a follow-up) is a replay of the
     * pair and clears the child's round state with it.
     *
     * @return the slide the round opened on
     */
    private Slide openRoundUnlocked(LiveSession session, Slide slide, boolean restart) {
        String sessionId = session.getId();
        String slideId = slide.getId();
        RoundPhase phase = initialPhaseFor(session, slide);
        LiveRoundState current = roundStateStore.load(sessionId)
                .orElseGet(() -> LiveRoundState.idle(session.getPublicId()));
        // Every open starts the round from scratch — tally, votes, and answers clear
        // together. Clearing the tally while answers survived a reopen let the
        // resubmit reconciliation decrement an emptied hash, publishing zero or
        // negative counts (see TallyStore.decrement's ≥ 0 invariant).
        clearRoundRedis(sessionId, slideId);
        Deck deck = session.getDeck();
        if (deck.isAttachedFollowUp(slide)) {
            // Snapshot the candidates the moment the round opens, before anything is
            // published: the board votes on this exact set, so it must be readable
            // by every consumer of the round-started event — including the event
            // itself, which will carry it.
            followUpOptions.save(sessionId, slideId, mintFollowUpOptions(session, slide));
        }
        // Opening a slide that HAS a follow-up is a replay of the pair: the child's
        // round state from the previous run goes with it. The child re-mints its
        // candidates on its own open anyway, so this is hygiene — it stops a
        // replayed parent from leaving a stale, still-addressable child board behind.
        deck.attachedFollowUp(slide).ifPresent(child -> clearRoundRedis(sessionId, child.getId()));
        Settings.AnswerSettings effectiveAnswer =
                Settings.effectiveAnswerSettings(deck.getSettings(), slide.getSettings());
        LiveRoundState started = current.startedRound(slideId, Instant.now(), phase,
                timerDurationMs(effectiveAnswer));
        roundStateStore.save(sessionId, started);
        // Re-point the auto-close deadline (ADR 002): the superseded round's entry —
        // if any — must go regardless of whether the new round is timed, or a stale
        // timer could fire into the new round.
        if (current.currentSlideId() != null && !current.currentSlideId().equals(slideId)) {
            deadlines.cancel(SessionDeadline.closeRound(sessionId, current.currentSlideId()));
        }
        if (started.timed()) {
            deadlines.schedule(SessionDeadline.closeRound(sessionId, slideId), started.deadline());
        } else {
            deadlines.cancel(SessionDeadline.closeRound(sessionId, slideId));
        }
        SessionEvent event;
        if (restart) {
            // RoundRestarted carries no slide — the client already has this round's
            // view (and its follow-up config) from the event that opened it.
            event = SessionEvents.roundRestarted(started);
        } else if (phase == RoundPhase.SUBMIT_LIVE) {
            event = SessionEvents.liveResultsShown(started, slide, tallyStore.tally(sessionId, slideId),
                    effectiveAnswer, this::slideItemImageUrl, followUpConfig(session, slide),
                    deck.attachedFollowUp(slide).isPresent());
        } else {
            event = SessionEvents.roundStarted(started, slide, effectiveAnswer, this::slideItemImageUrl,
                    followUpConfig(session, slide), deck.attachedFollowUp(slide).isPresent());
        }
        publisher.publish(session.getPublicId(), event);
        return slide;
    }

    /**
     * Drops every per-slide Redis key of one round — answers, tally, votes, Q&amp;A
     * host answers, and the follow-up candidate snapshot. The set is identical
     * wherever a round's live state has to go (an open/reopen, the sibling child
     * of a replayed parent, session teardown), so it lives here rather than being
     * spelled out three times and drifting when a store is added.
     */
    private void clearRoundRedis(String sessionId, String slideId) {
        answerStore.clear(sessionId, slideId);
        tallyStore.clear(sessionId, slideId);
        voteStore.clear(sessionId, slideId);
        qandaHostAnswers.clear(sessionId, slideId);
        followUpOptions.clear(sessionId, slideId);
    }

    /**
     * The answers a parent round collected, as the follow-up's candidates are
     * minted from them: the Redis copy first, falling back to the durable one.
     * Redis holds a round's answers from its open until the session ends — only a
     * replay of that same round clears them — while the Mongo copy exists from the
     * moment the round was closed and scored ({@code RoundResultProjector.persist}
     * flushes it). So the fallback covers the snapshot having aged out under its
     * TTL on a long-running session, and the Redis read covers a parent that
     * somehow reaches the follow-up unscored.
     */
    private List<Answer> parentAnswers(String sessionId, String parentId) {
        List<Answer> live = answerStore.answers(sessionId, parentId);
        return live.isEmpty() ? roundResults.answersOf(sessionId, parentId) : live;
    }

    /**
     * Mints the candidate set for {@code followUpSlide} from its parent round's
     * submissions. The caller must have established that the slide is a valid
     * attached follow-up ({@link Deck#isAttachedFollowUp}), so its parent id is
     * present and resolves against the same snapshot.
     *
     * <p>The child's own mode goes in with them: {@code SPOT_THE_ANSWER} seeds
     * the parent's authored answer among the submissions, so the mint is not
     * mode-independent.
     */
    private FollowUpOptionSet mintFollowUpOptions(LiveSession session, Slide followUpSlide) {
        String parentId = followUpSlide.getParentId();
        Slide parent = session.getDeck().findSlide(parentId).orElse(null);
        FollowUpMode mode = followUpSlide.getContent() instanceof FollowUpContent content ? content.mode() : null;
        return FollowUpOptions.mint(parent, parentAnswers(session.getId(), parentId), mode,
                this::followUpCandidateImageUrl);
    }

    /**
     * The follow-up dimension of {@code slide}'s round for its {@code SlideView} —
     * {@code null} unless the slide is a validated attached follow-up.
     *
     * <p>Reads the candidates back from the snapshot {@link #openRoundUnlocked}
     * just saved rather than re-minting them: the board every client renders — and
     * every pick is validated against — must be the one Redis holds, so a parent
     * whose answers moved on cannot leave two different boards in play.
     */
    private FollowUpConfigView followUpConfig(LiveSession session, Slide slide) {
        Deck deck = session.getDeck();
        if (!deck.isAttachedFollowUp(slide) || !(slide.getContent() instanceof FollowUpContent content)) {
            return null;
        }
        return FollowUpConfigView.from(content, deck.findSlide(slide.getParentId()).orElse(null),
                followUpOptions.load(session.getId(), slide.getId()));
    }

    /**
     * Whether a follow-up round has anything to play: its parent round is scored
     * <em>and</em> its parent's submissions mint at least one candidate. Used by
     * {@link #resolveNextSlide}'s auto-skip — a follow-up that fails either test
     * is stepped over rather than opened as an empty board — and by
     * {@link #goTo}, which rejects the same follow-up instead of skipping it.
     *
     * <p>A mode that seeds the parent's authored answer
     * ({@link FollowUpMode#requiresAnswerKey}) needs a <em>submitted</em>
     * candidate, not merely a non-empty set: the seed alone would open a
     * one-card board where the only pick available is the authored answer, so
     * everyone grades correct and collects full points, a streak, and the
     * fastest-correct bonus for reading the only card on screen. The mint that
     * decides this is a throwaway — the board the round actually opens on is
     * minted and snapshotted in {@link #openRoundUnlocked} — and only its
     * <em>counts</em> are read here, which the shuffle a {@code SPOT_THE_ANSWER}
     * mint ends on cannot change.
     */
    private boolean followUpPlayable(LiveSession session, Slide slide) {
        if (roundResults.find(session.getId(), slide.getParentId()).isEmpty()) {
            return false;
        }
        List<FollowUpOption> candidates = mintFollowUpOptions(session, slide).options();
        FollowUpMode mode = slide.getContent() instanceof FollowUpContent content ? content.mode() : null;
        if (mode != null && mode.requiresAnswerKey()) {
            return candidates.stream().anyMatch(candidate -> !candidate.authoredAnswer());
        }
        return !candidates.isEmpty();
    }

    /**
     * F4 guard: rejects opening a <em>different</em> slide while the current round
     * is still accepting submissions or votes (a voting round is unscored — jumping
     * away would silently drop its votes; reveal its results first). Same-slide
     * re-open and opening after a round has closed both pass. Must be called under
     * the session lock.
     */
    private void requireRoundOpenable(String sessionId, String slideId) {
        roundStateStore.load(sessionId).ifPresent(current -> {
            if (current.currentSlideId() != null
                    && (current.phase().acceptsSubmissions() || current.phase().acceptsVotes())
                    && !slideId.equals(current.currentSlideId())) {
                throw new ConflictException("ROUND_ALREADY_OPEN",
                        "a round is already open on another slide");
            }
        });
    }

    /**
     * The auto-close timer length for a round (ADR 002): the slide's resolved
     * {@code countdownTime} (seconds) when positive, else {@code null} — the round
     * opens untimed and keeps the host-driven close.
     */
    private Long timerDurationMs(Settings.AnswerSettings effectiveAnswer) {
        return effectiveAnswer != null && effectiveAnswer.countdownTime() > 0
                ? effectiveAnswer.countdownTime() * 1000L
                : null;
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
     * follow-up child that has nothing to play (open-decisions B3), applies the F4
     * guard, then opens it as a round.
     *
     * <p>The playability rule is {@link #followUpPlayable}'s, the same one
     * {@link #resolveNextSlide} silently steps over — a host who names the slide
     * gets a {@code 409} instead. Its two halves are reported apart because they
     * are different situations for the host: {@code PARENT_ROUND_NOT_SCORED} says
     * "play the parent first", while {@code FOLLOW_UP_NOT_PLAYABLE} says the
     * parent round produced no board worth opening (no candidates at all, or —
     * on a mode that seeds the answer key — nothing but the seed, which would
     * hand the whole room a free correct pick).
     */
    public void goTo(String sessionId, String slideId) {
        LiveSession session = requireSession(sessionId);
        Slide slide = requireSlide(session, slideId);
        locks.withLock(sessionId, () -> {
            Deck deck = session.getDeck();
            if (deck.isAttachedFollowUp(slide)) {
                if (roundResults.find(sessionId, slide.getParentId()).isEmpty()) {
                    throw new ConflictException("PARENT_ROUND_NOT_SCORED",
                            "a follow-up child cannot open before its parent round is scored");
                }
                if (!followUpPlayable(session, slide)) {
                    throw new ConflictException("FOLLOW_UP_NOT_PLAYABLE",
                            "the parent round's submissions mint no board for this follow-up");
                }
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
     *
     * <p><strong>Unplayable follow-ups are skipped.</strong> A follow-up whose
     * parent round was never played (so never scored) or whose parent's submissions
     * mint no candidates has nothing to put on a board, so navigation steps over it
     * to the slide after — running off the end if it was the last, which ends the
     * deck exactly as an exhausted snapshot does. The skip is deliberately silent:
     * only {@link #goTo}, where the host named the slide, rejects the same
     * situation outright ({@code PARENT_ROUND_NOT_SCORED} /
     * {@code FOLLOW_UP_NOT_PLAYABLE}).
     */
    private Slide resolveNextSlide(LiveSession session, String currentSlideId) {
        List<Slide> ordered = session.getDeck().getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
        Deck deck = session.getDeck();
        for (int i = nextIndex(ordered, currentSlideId); i < ordered.size(); i++) {
            Slide candidate = ordered.get(i);
            if (!deck.isAttachedFollowUp(candidate) || followUpPlayable(session, candidate)) {
                return candidate;
            }
        }
        return null;
    }

    /**
     * Where {@link #resolveNextSlide} starts looking: the position after
     * {@code currentSlideId}, or the head of the deck when no round has opened yet
     * — or when the current slide isn't in the snapshot at all (shouldn't happen;
     * starting over beats stalling).
     */
    private static int nextIndex(List<Slide> ordered, String currentSlideId) {
        if (currentSlideId == null) {
            return 0;
        }
        for (int i = 0; i < ordered.size(); i++) {
            if (currentSlideId.equals(ordered.get(i).getId())) {
                return i + 1;
            }
        }
        return 0;
    }

    /** Whether {@code slideId} is the last slide of the deck snapshot's sorted order. */
    private boolean isLastRound(LiveSession session, String slideId) {
        List<Slide> ordered = session.getDeck().getSlides().stream()
                .sorted(SlideRankService.ordering())
                .toList();
        return !ordered.isEmpty() && slideId.equals(ordered.get(ordered.size() - 1).getId());
    }

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

    /**
     * Drops every Redis key for a now-terminal session (state, presence, and each
     * slide's round state via {@link #clearRoundRedis}) and its pending deadline
     * entries, so no timer can fire into a finished session.
     */
    private void clearSessionRedis(LiveSession session) {
        String sessionId = session.getId();
        roundStateStore.load(sessionId).ifPresent(state -> {
            if (state.currentSlideId() != null) {
                deadlines.cancel(SessionDeadline.closeRound(sessionId, state.currentSlideId()));
            }
        });
        deadlines.cancel(SessionDeadline.hostAway(sessionId));
        deadlines.cancel(SessionDeadline.graceCancel(sessionId));
        roundStateStore.clear(sessionId);
        presenceStore.clear(sessionId);
        for (Slide slide : session.getDeck().getSlides()) {
            clearRoundRedis(sessionId, slide.getId());
        }
    }

    /** The outcome of a successful {@link #join}: the session (for its publicId) and the new participant. */
    public record JoinResult(LiveSession session, Participant participant) {
    }
}
