package com.cephadex.ambi.session.liveSession;

import java.util.ArrayList;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

import com.cephadex.ambi.presentation.deck.Deck;
import com.cephadex.ambi.session.RoomCode;
import com.cephadex.ambi.session.liveSession.enums.LiveSessionLifecycle;
import com.cephadex.ambi.session.liveSession.enums.RoundPhase;

import lombok.Getter;

/**
 * Domain aggregate for a single run of a deck — the persistent record of a live
 * session from lobby through to its terminal state.
 *
 * <p>
 * This is the durable half of a live session: identity ({@link #roomCode},
 * {@link #inviteToken}), the lifecycle {@link #status}, the {@link #roster}, and
 * a {@link #deck} snapshot frozen at creation. The volatile per-round state
 * (which slide is open, submission tallies, the live round phase) lives in Redis
 * as {@code LiveRoundState} and is driven by {@code LiveSessionOrchestrator} —
 * not here. The {@link #phase} field is only a persisted snapshot of that.
 * </p>
 *
 * <p>
 * Construction is funneled through {@link #create}: call it once to open a
 * session, then let MongoDB and Jackson rehydrate the object on subsequent
 * reads. The no-arg constructor exists only for that deserialization.
 * </p>
 *
 * <p>
 * Every participant — the host included — is referenced by participant id, never
 * user id (the {@code Participant} aggregate strips the user id while a session
 * is live). The {@link #roster} and {@link #hostParticipantId} therefore both
 * hold participant ids.
 * </p>
 **/

@Getter
@Document(collection = "LiveSessions")
public class LiveSession {

    @Id
    private String id;

    @Indexed(unique=true)
    @Field("public_id")
    private String publicId;

    @Indexed(unique=true)
    @Field("room_code")
    private String roomCode;


    // @Field("invite_token")
    // private String inviteToken;

    @Field("status")
    private LiveSessionLifecycle status = LiveSessionLifecycle.LOBBY;

    @Field("phase")
    private RoundPhase phase = RoundPhase.SUBMIT;

    // All participants in a run, even the host get a participant instance
    @Field("host_participant_id")
    private String hostParticipantId;

    // Snapshot of the deck at the time of run creation
    @Field("deck")
    private Deck deck;

    @Field("roster")
    private List<String> roster = new ArrayList<>();

    /** No-arg constructor reserved for MongoDB/Jackson deserialization. */
    private LiveSession() {
    }

    /**
     * Opens a brand-new session in the {@link LiveSessionLifecycle#LOBBY lobby}.
     *
     * <p>
     * Mints a fresh {@link #publicId}, a human-friendly {@link #roomCode} (see
     * {@link RoomCode#generate()}) and an {@link #inviteToken}, freezes the given
     * {@code deck} as the session snapshot, and seeds the {@link #roster} with the
     * host. The room code is uniqueness-blind — the caller reconciles a
     * duplicate-key collision by re-invoking, the DB index being the authority.
     * </p>
     *
     * @param hostParticipantId the host's participant id; required
     * @param deck              the deck snapshot to run; required
     * @return a new session sitting in the lobby with the host on the roster
     * @throws NullPointerException if {@code hostParticipantId} or {@code deck} is
     *                              {@code null}
     */
    public static LiveSession create(String hostParticipantId, Deck deck) {
        Objects.requireNonNull(hostParticipantId, "hostParticipantId required");
        Objects.requireNonNull(deck, "deck required");

        LiveSession s = new LiveSession();
        s.publicId = UUID.randomUUID().toString();
        s.roomCode = RoomCode.generate().value();
        // s.inviteToken = UUID.randomUUID().toString();
        s.status = LiveSessionLifecycle.LOBBY;
        s.phase = RoundPhase.SUBMIT;
        s.hostParticipantId = hostParticipantId;
        s.deck = deck;
        s.roster = new ArrayList<>();
        s.roster.add(hostParticipantId);
        return s;
    }

    // ── Roster ───────────────────────────────────────────────────────────────
    // Membership of the run. Entries are participant ids; the host is always one
    // of them and is the only member that can't be removed.

    /** Whether {@code participantId} is the host of this session. */
    public boolean isHost(String participantId) {
        return Objects.equals(hostParticipantId, participantId);
    }

    /** Whether {@code participantId} is currently on the roster. */
    public boolean hasParticipant(String participantId) {
        return roster.contains(participantId);
    }

    /** Number of participants currently on the roster (the host included). */
    public int participantCount() {
        return roster.size();
    }

    /**
     * Adds a participant to the roster.
     *
     * @param participantId the joining participant's id; required
     * @return {@code true} if the roster changed, {@code false} if the
     *         participant was already on it
     * @throws NullPointerException  if {@code participantId} is {@code null}
     * @throws IllegalStateException if the session has already reached a terminal
     *                               state (see {@link #isTerminal()})
     */
    public boolean addParticipant(String participantId) {
        Objects.requireNonNull(participantId, "participantId required");
        if (isTerminal()) {
            throw new IllegalStateException("cannot join a session in status " + status);
        }
        if (roster.contains(participantId)) {
            return false;
        }
        return roster.add(participantId);
    }

    /**
     * Removes a participant from the roster.
     *
     * @param participantId the leaving participant's id
     * @return {@code true} if the participant was on the roster and was removed
     * @throws IllegalStateException if {@code participantId} is the host — the
     *                               host leaving ends the session instead (see
     *                               {@link #endLiveSession()} / {@link #cancel()})
     */
    public boolean removeParticipant(String participantId) {
        if (isHost(participantId)) {
            throw new IllegalStateException("the host cannot leave the session");
        }
        return roster.remove(participantId);
    }

    // ── Lifecycle ────────────────────────────────────────────────────────────
    // Transitions over LiveSessionLifecycle. Each guards its precondition so an
    // out-of-order call (a double-clicked start, a finish after cancel) fails
    // loudly rather than corrupting the run.

    /** Whether the session is still gathering players in the lobby. */
    public boolean isInLobby() {
        return status == LiveSessionLifecycle.LOBBY;
    }

    /**
     * Whether the session is actively running. There is no distinct results
     * status — the end-of-round/end-of-game results view is a {@code RoundPhase}
     * concern while the session stays {@link LiveSessionLifecycle#IN_PROGRESS}.
     */
    public boolean isLive() {
        return status == LiveSessionLifecycle.IN_PROGRESS;
    }

    /** Whether the session has reached a terminal state (finished or cancelled). */
    public boolean isTerminal() {
        return status == LiveSessionLifecycle.FINISHED || status == LiveSessionLifecycle.CANCELLED;
    }

    /**
     * Starts play: {@link LiveSessionLifecycle#LOBBY} → {@link LiveSessionLifecycle#IN_PROGRESS},
     * opening on the {@link RoundPhase#SUBMIT} phase.
     *
     * @throws IllegalStateException if the session is not in the lobby
     */
    public void start() {
        requireStatus(LiveSessionLifecycle.LOBBY, "start");
        this.status = LiveSessionLifecycle.IN_PROGRESS;
        this.phase = RoundPhase.SUBMIT;
    }

    /**
     * Ends the session normally: → {@link LiveSessionLifecycle#FINISHED}. Valid from
     * any non-terminal state.
     *
     * @throws IllegalStateException if the session is already terminal
     */
    public void endLiveSession() {
        if (isTerminal()) {
            throw new IllegalStateException("cannot finish a session in status " + status);
        }
        this.status = LiveSessionLifecycle.FINISHED;
    }

    /**
     * Cancels the session: → {@link LiveSessionLifecycle#CANCELLED}. Valid from any
     * non-terminal state. Use this rather than {@link #endLiveSession()} when the
     * run is being abandoned (host left, never started, error) instead of
     * completing.
     *
     * @throws IllegalStateException if the session is already terminal
     */
    public void cancel() {
        if (isTerminal()) {
            throw new IllegalStateException("cannot cancel a session in status " + status);
        }
        this.status = LiveSessionLifecycle.CANCELLED;
    }

    /**
     * Persists the current round {@link RoundPhase} onto this snapshot.
     *
     * <p>
     * The authoritative live phase is the Redis {@code LiveRoundState} driven by
     * {@code LiveSessionOrchestrator}; this only mirrors it onto the durable
     * document (e.g. when flushing state to MongoDB) so a rehydrated session
     * reflects the phase it was last in.
     * </p>
     *
     * @param phase the phase to record; required
     * @throws NullPointerException if {@code phase} is {@code null}
     */
    public void recordPhase(RoundPhase phase) {
        this.phase = Objects.requireNonNull(phase, "phase required");
    }

    // ── Identity ─────────────────────────────────────────────────────────────

    /** Rotates the {@link #inviteToken}, invalidating any previously shared link. */
    // public void regenerateInviteToken() {
    //     this.inviteToken = UUID.randomUUID().toString();
    // }

    /** Rotates the {@link #roomCode} (uniqueness-blind — see {@link RoomCode#generate()}). */
    public void regenerateRoomCode() {
        this.roomCode = RoomCode.generate().value();
    }

    private void requireStatus(LiveSessionLifecycle expected, String action) {
        if (status != expected) {
            throw new IllegalStateException(
                    "cannot " + action + " a session in status " + status + " (expected " + expected + ")");
        }
    }

}
