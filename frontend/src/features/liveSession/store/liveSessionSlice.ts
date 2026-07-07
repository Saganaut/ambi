// The live read model for a session, fed by the socket. `SessionConnectionProvider`
// seeds it once from the REST snapshot (`seed`), then dispatches every
// `SessionEvent` from the STOMP topic through `eventReceived`; the single reducer
// switch below is the one auditable place where each event mutates the view. The
// read hook `useLiveSessionQuery` selects from here — nothing reads the socket or
// the snapshot query directly.
//
// The snapshot and the events describe the same shape (same participant-safe
// DTOs), so seeding then patching is coherent: a client that (re)connects
// mid-session lands on the current state and stays live from there.
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

import type {
  ParticipantView,
  QAndAQuestionView,
  ScoreboardEntry,
  SessionSnapshotResponse,
  SlideView,
} from "./liveSessionApi.gen";
import type {
  LiveSessionLifecycle,
  OptionCounts,
  ParticipantOutcome,
  RoundPhase,
  SessionEvent,
} from "./liveSessionEvents";

/** Connection status of the underlying STOMP client (driven by the socket layer). */
export type ConnectionState =
  | "idle"
  | "connecting"
  | "connected"
  | "disconnected";

/** The scored result of the current round, from the last `ResultsRevealed`. */
export interface RoundResults {
  slideId: string;
  outcomes: ParticipantOutcome[];
  optionCounts: OptionCounts;
  correctOption: string | null;
  scoreboard: ScoreboardEntry[];
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
  /** The current round's live per-option tally. */
  optionCounts: OptionCounts;
  /** The current Q&A round's questions (with host answers); empty otherwise. */
  qAndAQuestions: QAndAQuestionView[];
  results: RoundResults | null;
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
  optionCounts: {},
  qAndAQuestions: [],
  results: null,
  scoreboard: [],
  finalScoreboard: null,
  cancelReason: null,
  viewerParticipantId: null,
  viewerIsHost: false,
  connection: "idle",
  showRoomCodeInHeader: false,
  showJoinInfoInResults: false,
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
      state.optionCounts = s.optionTally ?? {};
      state.qAndAQuestions = s.qAndAQuestions ?? [];
      state.scoreboard = s.scoreboard ?? [];
      state.viewerParticipantId = s.viewerParticipantId ?? null;
      state.showRoomCodeInHeader = s.showRoomCodeInHeader ?? false;
      state.showJoinInfoInResults = s.showJoinInfoInResults ?? false;
      state.viewerIsHost = s.viewerIsHost ?? false;
      // A fresh snapshot supersedes any prior round-local / terminal state.
      state.results = null;
      state.finalScoreboard = null;
      state.cancelReason = null;
    },

    /**
     * Apply one broadcast event. The `phase` is inferred from which event
     * arrives — each corresponds to a round-phase transition — so it stays in
     * step with the same value the snapshot would report.
     */
    eventReceived(state, action: PayloadAction<SessionEvent>) {
      const e = action.payload;
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
        case "ParticipantRemoved":
          state.roster = e.roster;
          delete state.participants[e.participantId];
          break;
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
          state.optionCounts = {};
          state.qAndAQuestions = [];
          state.results = null;
          state.phase = "SUBMIT";
          break;
        case "LiveResultsShown":
          state.currentSlideId = e.slideId;
          if (e.slide) state.currentSlide = e.slide;
          state.roundStartedAt = e.roundStartedAt;
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
            terminal: e.terminal,
          };
          state.optionCounts = e.optionCounts;
          state.scoreboard = e.scoreboard;
          state.phase = "REVEAL_RESULTS";
          break;
        case "RoundRestarted":
          state.currentSlideId = e.slideId;
          state.roundStartedAt = e.roundStartedAt;
          state.phase = e.phase;
          state.optionCounts = {};
          state.qAndAQuestions = [];
          state.results = null;
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

export const { seed, eventReceived, connectionChanged, reset } =
  liveSessionSlice.actions;
export const liveSessionReducer = liveSessionSlice.reducer;
