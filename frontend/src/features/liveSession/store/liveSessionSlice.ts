// The live read model for a session, fed by the socket. `SessionConnectionProvider`
// seeds it from the REST snapshot (`seed`), then dispatches every
// `SessionEventEnvelope` from the STOMP topic through `eventReceived`; the single
// `applyEvent` switch below is the one auditable place where each event mutates
// the view. The read hook `useLiveSessionQuery` selects from here — nothing reads
// the socket or the snapshot query directly.
//
// The snapshot and the events describe the same shape (same participant-safe
// DTOs), so seeding then patching is coherent: a client that (re)connects
// mid-session lands on the current state and stays live from there.
//
// Reconciliation (the envelope's `sequence`/`eventId`): the snapshot's
// `lastSequence` says which event the seeded state reflects, so an envelope
// applies only when it continues that run exactly (`lastSequence + 1`). Anything
// older is a redelivery and is dropped; anything newer means events were missed,
// so it is buffered and `resyncNeeded` asks the provider for a fresh snapshot —
// the buffer then replays on top of the re-seed. The reducers stay pure: the
// flag is the whole interface to the refetch, which the provider owns.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  ParticipantView,
  PlaceTargetView,
  QAndAQuestionView,
  ScoreboardEntry,
  SessionSnapshotResponse,
  SlideView,
  VoteOptionView,
} from "./liveSessionApi.gen";
import type {
  DrawingSubmission,
  LiveSessionLifecycle,
  OptionCounts,
  ParticipantOutcome,
  RoundPhase,
  SessionEvent,
  SessionEventEnvelope,
} from "./liveSessionEvents";

/**
 * How many recently applied `eventId`s are remembered as a dedup backstop. A
 * duplicate delivery normally fails the sequence check anyway; this catches the
 * one case that wouldn't — a redelivery arriving after a re-seed rewound
 * `lastSequence`. Sized for a few seconds of the busiest stream (tallies).
 */
const APPLIED_EVENT_ID_LIMIT = 64;

/**
 * How many out-of-order envelopes are held while a re-seed is pending. Past the
 * cap the freshest are dropped: they are the least likely to become contiguous,
 * and the snapshot the gap already triggered supersedes them regardless.
 */
const PENDING_EVENT_LIMIT = 64;

/** Connection status of the underlying STOMP client (driven by the socket layer). */
export type ConnectionState = "idle" | "connecting" | "connected" | "disconnected";

/** The scored result of the current round, from the last `ResultsRevealed`. */
export interface RoundResults {
  slideId: string;
  outcomes: ParticipantOutcome[];
  optionCounts: OptionCounts;
  correctOption: string | null;
  scoreboard: ScoreboardEntry[];
  /** Submitted-drawings gallery for a Drawing round; null otherwise. */
  drawings: DrawingSubmission[] | null;
  /**
   * Revealed target circles for a Place-on-Image round; null otherwise. Flows
   * through the `ResultsRevealed` event exactly like {@link drawings}. A late
   * joiner who never saw that event reads the snapshot copy instead — see
   * {@link LiveSessionState.placeTargets}.
   */
  placeTargets: PlaceTargetView[] | null;
  terminal: boolean;
}

export interface LiveSessionState {
  /** False until the first snapshot has seeded the store. */
  seeded: boolean;
  sessionId: string | null;
  publicId: string | null;
  /** The short join code participants enter or scan (via QR) to join the room. */
  roomCode: string | null;
  status: LiveSessionLifecycle | null;
  phase: RoundPhase | null;
  /** Participants keyed by id; the ordered ids live in `roster`. */
  participants: Record<string, ParticipantView>;
  roster: string[];
  currentSlideId: string | null;
  currentSlide: SlideView | null;
  roundStartedAt: string | null;
  /**
   * The timed round's server-authoritative auto-close instant (ADR 002); null
   * for an untimed round. While paused it holds the deadline as frozen at the
   * pause — remaining time is `roundDeadline - timerPausedAt`.
   */
  roundDeadline: string | null;
  /** When the round timer was paused; null while it is running (or untimed). */
  timerPausedAt: string | null;
  /** The current round's live per-option tally. */
  optionCounts: OptionCounts;
  /** The current Q&A round's questions (with host answers); empty otherwise. */
  qAndAQuestions: QAndAQuestionView[];
  /** The VOTE round's anonymised options (D3); empty outside a VOTE phase. */
  voteOptions: VoteOptionView[];
  /** The option the viewer voted for this round; null until they vote. */
  myVoteOptionId: string | null;
  /** Running number of votes cast in the VOTE round (never per-option counts). */
  votesCast: number;
  /**
   * On a follow-up round, the candidate the viewer authored (so their own card
   * can be marked un-pickable — the backend rejects a self-vote); null when the
   * viewer authored none, or outside a follow-up round.
   *
   * Per-participant, so it can only ever arrive on the REST snapshot: the STOMP
   * topic is shared by every client, so no broadcast event may carry it and no
   * case in `applyEvent` ever patches it. A client already connected when a
   * follow-up round opens learns it by refetching the snapshot — see
   * `SessionConnectionProvider`.
   */
  myFollowUpOptionId: string | null;
  results: RoundResults | null;
  /**
   * The revealed Place-on-Image target circles as carried by the REST snapshot —
   * the seam for a client that JOINS mid-reveal (`seed` deliberately never
   * reconstructs a `RoundResults`, so `results` stays null for a late joiner,
   * yet the snapshot still carries `placeTargets` during REVEAL_RESULTS). A
   * client that was connected through the reveal reads `results.placeTargets`
   * instead; the component prefers that and falls back here. Null outside a
   * revealed Place-on-Image round.
   */
  placeTargets: PlaceTargetView[] | null;
  scoreboard: ScoreboardEntry[];
  finalScoreboard: ScoreboardEntry[] | null;
  cancelReason: string | null;
  viewerParticipantId: string | null;
  viewerIsHost: boolean;
  connection: ConnectionState;
  /** Whether the deck's invite settings show the room code in the header. */
  showRoomCodeInHeader: boolean;
  /** Whether the deck's invite settings show join info on the results screen. */
  showJoinInfoInResults: boolean;
  /**
   * The sequence of the last event this state reflects — from the snapshot on
   * `seed`, then bumped by each applied envelope. 0 before anything has been
   * emitted for the session.
   */
  lastSequence: number;
  /**
   * Envelopes that arrived ahead of {@link lastSequence} + 1, ascending. They
   * are replayed the moment the run becomes contiguous — either because the
   * missing envelope turns up or because a fresh snapshot re-seeds past it.
   */
  pendingEvents: SessionEventEnvelope[];
  /** Recently applied event ids, oldest first — the duplicate-delivery backstop. */
  appliedEventIds: string[];
  /**
   * A gap was detected: the provider should refetch the snapshot and re-seed.
   * Clears itself as soon as {@link pendingEvents} drains contiguously.
   */
  resyncNeeded: boolean;
}

const initialState: LiveSessionState = {
  seeded: false,
  sessionId: null,
  publicId: null,
  roomCode: null,
  status: null,
  phase: null,
  participants: {},
  roster: [],
  currentSlideId: null,
  currentSlide: null,
  roundStartedAt: null,
  roundDeadline: null,
  timerPausedAt: null,
  optionCounts: {},
  qAndAQuestions: [],
  voteOptions: [],
  myVoteOptionId: null,
  votesCast: 0,
  myFollowUpOptionId: null,
  results: null,
  placeTargets: null,
  scoreboard: [],
  finalScoreboard: null,
  cancelReason: null,
  viewerParticipantId: null,
  viewerIsHost: false,
  connection: "idle",
  showRoomCodeInHeader: false,
  showJoinInfoInResults: false,
  lastSequence: 0,
  pendingEvents: [],
  appliedEventIds: [],
  resyncNeeded: false,
};

const liveSessionSlice = createSlice({
  name: "liveSession",
  initialState,
  reducers: {
    /** Hydrate the store from a fresh REST snapshot (on connect / reconnect). */
    seed(state, action: PayloadAction<SessionSnapshotResponse>) {
      const s = action.payload;
      state.seeded = true;
      state.sessionId = s.sessionId ?? null;
      state.publicId = s.publicId ?? null;
      state.roomCode = s.roomCode ?? null;
      state.status = s.status ?? null;
      state.phase = s.phase ?? null;
      state.roster = (s.roster ?? [])
        .map((p) => p.participantId)
        .filter((id): id is string => id != null);
      state.participants = {};
      for (const p of s.roster ?? []) {
        if (p.participantId != null) state.participants[p.participantId] = p;
      }
      state.currentSlideId = s.currentSlideId ?? null;
      state.currentSlide = s.currentSlide ?? null;
      state.roundStartedAt = s.currentRoundStartedAt ?? null;
      state.roundDeadline = s.currentRoundDeadline ?? null;
      state.timerPausedAt = s.currentRoundPausedAt ?? null;
      state.optionCounts = s.optionTally ?? {};
      state.qAndAQuestions = s.qAndAQuestions ?? [];
      state.voteOptions = s.voteOptions ?? [];
      state.myVoteOptionId = s.myVoteOptionId ?? null;
      state.votesCast = s.votesCast ?? 0;
      // The snapshot is the only channel for this (see the field's docs), and
      // `seed` is also the re-seed path — every refetch (gap resync, reconnect,
      // or the provider's follow-up refetch) lands here, so a mid-session
      // re-seed refreshes it exactly like the first one.
      state.myFollowUpOptionId = s.myFollowUpOptionId ?? null;
      state.scoreboard = s.scoreboard ?? [];
      state.viewerParticipantId = s.viewerParticipantId ?? null;
      state.showRoomCodeInHeader = s.showRoomCodeInHeader ?? false;
      state.showJoinInfoInResults = s.showJoinInfoInResults ?? false;
      state.viewerIsHost = s.viewerIsHost ?? false;
      // A fresh snapshot supersedes any prior round-local / terminal state.
      state.results = null;
      // ...except the revealed Place-on-Image targets, which the snapshot itself
      // carries during REVEAL_RESULTS so a late joiner discloses them despite
      // never reconstructing a RoundResults. Null on every other phase/kind.
      state.placeTargets = s.placeTargets ?? null;
      state.finalScoreboard = null;
      state.cancelReason = null;
      // The snapshot is authoritative for everything up to its own sequence, so
      // buffered envelopes it already reflects are redundant; the rest replay on
      // top of it, and whatever is left over (still a gap) keeps `resyncNeeded`
      // set so the provider fetches again.
      state.lastSequence = s.lastSequence ?? 0;
      state.pendingEvents = state.pendingEvents
        .filter((envelope) => envelope.sequence > state.lastSequence)
        .sort((a, b) => a.sequence - b.sequence);
      drainPendingEvents(state);
    },

    /**
     * Apply one broadcast envelope, if it is the next one in the session's run.
     * A stale or duplicate delivery is dropped; one from beyond the next
     * sequence is buffered for replay after a re-seed (see the module header).
     */
    eventReceived(state, action: PayloadAction<SessionEventEnvelope>) {
      const envelope = action.payload;
      if (isDuplicate(state, envelope)) return;
      if (envelope.sequence <= state.lastSequence) return;

      if (envelope.sequence > state.lastSequence + 1) {
        bufferPendingEvent(state, envelope);
        state.resyncNeeded = true;
        return;
      }

      applyEnvelope(state, envelope);
      // A buffered run can become contiguous the moment the missing envelope
      // lands — replaying it here spares a snapshot round-trip.
      drainPendingEvents(state);
    },

    /**
     * Remember which option the viewer voted for (the vote POST returns no body
     * and `VoteCast` never identifies the voter, so the client records its own).
     */
    myVoteRecorded(state, action: PayloadAction<string>) {
      state.myVoteOptionId = action.payload;
    },

    /** Reflect the socket's connection status for UI (e.g. a reconnecting banner). */
    connectionChanged(state, action: PayloadAction<ConnectionState>) {
      state.connection = action.payload;
    },

    /** Tear down on leaving the session page. */
    reset() {
      return initialState;
    },
  },
});

/**
 * Apply one broadcast event to the read model. The `phase` is inferred from
 * which event arrives — each corresponds to a round-phase transition — so it
 * stays in step with the same value the snapshot would report.
 *
 * The single switch every event passes through, whether it arrived in order
 * (`eventReceived`) or was buffered across a gap and replayed after a re-seed.
 */
function applyEvent(state: LiveSessionState, e: SessionEvent) {
  switch (e.type) {
    case "LiveSessionStarted":
      state.status = e.status;
      state.phase = e.phase;
      break;
    case "ParticipantJoined":
      if (e.participant.participantId != null) {
        state.participants[e.participant.participantId] = e.participant;
      }
      state.roster = e.roster;
      break;
    case "ParticipantLeft":
    case "ParticipantRemoved": {
      state.roster = e.roster;
      // delete state.participants[e.participantId];

      const { [e.participantId]: _removed, ...remainingParticipants } = state.participants;
      state.participants = remainingParticipants;

      break;
    }
    case "ParticipantReconnected":
      if (e.participant.participantId != null) {
        state.participants[e.participant.participantId] = e.participant;
      }
      break;
    case "PresenceChanged": {
      const p = state.participants[e.participantId];
      if (p) p.connectionStatus = e.status;
      break;
    }
    case "RoundStarted":
      state.currentSlideId = e.slideId;
      state.currentSlide = e.slide;
      state.roundStartedAt = e.roundStartedAt;
      state.roundDeadline = e.deadline;
      state.timerPausedAt = null;
      state.optionCounts = {};
      state.qAndAQuestions = [];
      resetVoting(state);
      // Stale for the new round, and no event can refill it — a follow-up round
      // learns the viewer's own candidate from the snapshot refetch instead.
      state.myFollowUpOptionId = null;
      state.results = null;
      state.placeTargets = null;
      state.phase = "SUBMIT";
      break;
    case "LiveResultsShown":
      state.currentSlideId = e.slideId;
      // Carrying a slide means a fresh round opened live (not the mid-round
      // go-live toggle) — reset the pause stamp along with the round state.
      if (e.slide) {
        state.currentSlide = e.slide;
        state.timerPausedAt = null;
      }
      state.roundStartedAt = e.roundStartedAt;
      state.roundDeadline = e.deadline;
      state.optionCounts = e.optionCounts;
      state.phase = "SUBMIT_LIVE";
      break;
    case "TallyUpdated":
      // Ignore a tally addressed to a slide we're no longer showing.
      if (e.slideId === state.currentSlideId) {
        state.optionCounts = e.optionCounts;
      }
      break;
    case "QAndAUpdated":
      // Full-state like TallyUpdated; same stale-slide guard.
      if (e.slideId === state.currentSlideId) {
        state.qAndAQuestions = e.questions;
      }
      break;
    case "SubmissionsLocked":
      state.phase = "LOCKED";
      break;
    case "VotingOpened":
      if (e.slideId === state.currentSlideId) {
        resetVoting(state);
        state.voteOptions = e.options;
        state.phase = "VOTE";
      }
      break;
    case "VoteCast":
      if (e.slideId === state.currentSlideId) {
        state.votesCast = e.votesCast;
      }
      break;
    case "ResponsesRevealed":
      state.optionCounts = e.optionCounts;
      state.phase = "REVEAL_RESPONSES";
      break;
    case "ResultsRevealed":
      state.results = {
        slideId: e.slideId,
        outcomes: e.outcomes,
        optionCounts: e.optionCounts,
        correctOption: e.correctOption,
        scoreboard: e.scoreboard,
        drawings: e.drawings ?? null,
        placeTargets: e.placeTargets ?? null,
        terminal: e.terminal,
      };
      // Mirror the reveal into the snapshot seam too, so both live and
      // late-joining clients read targets from the same field (the
      // component prefers `results.placeTargets` but falls back here).
      state.placeTargets = e.placeTargets ?? null;
      // The reveal's durable counts supersede the live tally only when the
      // kind is durably tallied at all — grid (and other non-MCQ) rounds
      // aren't yet (open-decisions D5), and wiping the live counts here
      // would blank the board until a snapshot re-seed.
      if (Object.keys(e.optionCounts).length > 0) {
        state.optionCounts = e.optionCounts;
      }
      state.scoreboard = e.scoreboard;
      state.phase = "REVEAL_RESULTS";
      break;
    case "RoundRestarted":
      state.currentSlideId = e.slideId;
      state.roundStartedAt = e.roundStartedAt;
      state.roundDeadline = e.deadline;
      state.timerPausedAt = null;
      state.phase = e.phase;
      state.optionCounts = {};
      state.qAndAQuestions = [];
      resetVoting(state);
      // Same as RoundStarted: the reopened round's candidates are minted afresh,
      // so the viewer's own one is unknown until the next snapshot.
      state.myFollowUpOptionId = null;
      state.results = null;
      state.placeTargets = null;
      break;
    case "TimerPaused":
      if (e.slideId === state.currentSlideId) {
        state.timerPausedAt = e.pausedAt;
        state.roundDeadline = e.deadline;
      }
      break;
    case "TimerResumed":
      if (e.slideId === state.currentSlideId) {
        state.timerPausedAt = null;
        state.roundDeadline = e.deadline;
      }
      break;
    case "LiveSessionEnded":
      state.status = "FINISHED";
      state.finalScoreboard = e.finalScoreboard;
      state.scoreboard = e.finalScoreboard;
      break;
    case "LiveSessionCancelled":
      state.status = "CANCELLED";
      state.cancelReason = e.reason;
      break;
  }
}

/**
 * Has this exact emission already been seen? The sequence check catches ordinary
 * redeliveries; this catches the one it can't — a duplicate arriving after a
 * re-seed rewound `lastSequence` past it — and stops a buffered envelope being
 * held twice.
 */
function isDuplicate(state: LiveSessionState, envelope: SessionEventEnvelope): boolean {
  return (
    state.appliedEventIds.includes(envelope.eventId) ||
    state.pendingEvents.some((pending) => pending.eventId === envelope.eventId)
  );
}

/** Apply an envelope's event and advance the run past it. */
function applyEnvelope(state: LiveSessionState, envelope: SessionEventEnvelope) {
  applyEvent(state, envelope.event);
  state.lastSequence = envelope.sequence;
  state.appliedEventIds.push(envelope.eventId);
  if (state.appliedEventIds.length > APPLIED_EVENT_ID_LIMIT) {
    state.appliedEventIds.splice(0, state.appliedEventIds.length - APPLIED_EVENT_ID_LIMIT);
  }
}

/** Hold an envelope that arrived past the gap, keeping the buffer ascending and capped. */
function bufferPendingEvent(state: LiveSessionState, envelope: SessionEventEnvelope) {
  const at = state.pendingEvents.findIndex((pending) => pending.sequence > envelope.sequence);
  if (at === -1) state.pendingEvents.push(envelope);
  else state.pendingEvents.splice(at, 0, envelope);
  // Overflow drops from the far end: those are the least likely to become
  // contiguous, and the pending re-seed supersedes them anyway.
  if (state.pendingEvents.length > PENDING_EVENT_LIMIT) {
    state.pendingEvents.length = PENDING_EVENT_LIMIT;
  }
}

/**
 * Replay buffered envelopes while they continue the run, then republish the
 * verdict: a non-empty buffer still means a gap, so `resyncNeeded` stays set
 * until the missing envelopes arrive or a snapshot re-seeds past them.
 */
function drainPendingEvents(state: LiveSessionState) {
  while (state.pendingEvents[0]?.sequence === state.lastSequence + 1) {
    const next = state.pendingEvents.shift();
    if (next) applyEnvelope(state, next);
  }
  state.resyncNeeded = state.pendingEvents.length > 0;
}

/** Clear the voting sub-state when a round (re)opens or voting starts afresh. */
function resetVoting(state: LiveSessionState) {
  state.voteOptions = [];
  state.myVoteOptionId = null;
  state.votesCast = 0;
}

export const { seed, eventReceived, myVoteRecorded, connectionChanged, reset } =
  liveSessionSlice.actions;
export const liveSessionReducer = liveSessionSlice.reducer;
