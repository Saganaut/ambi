/**
 * Redux slice for active InteractiveSession state.
 *
 * All WebSocket session events (ROUND_START, ROUND_RESULT, SESSION_ENDED, lobby
 * updates, presence, answer-progress) are dispatched here so any component can
 * read the current state without prop drilling.
 *
 * Element types are polymorphic — see `types/elements.ts` for the discriminated
 * unions. Per-element answer payloads are stored locally as `myAnswer` until
 * the round completes; the server confirms scoring via roundResultReceived.
 */
import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import type {
  InteractiveSessionResponse,
  InteractiveSessionChatMessageResponse,
  PlayerPlacementResponse,
  InteractiveSessionPlayerResponse,
  Team,
} from "./AmbiApi";
import type { AnswerPayload, DeckElement } from "../types/elements";
import type {
  AnonymizedSubmission,
  BestAnswerOutcome,
  VotePhaseStartPayload,
  VoteProgressPayload,
} from "../types/bestAnswer";

export interface RoundStartPayload {
  round: number;
  totalRounds: number;
  element: DeckElement;
  startedAt: string;
}

export interface PlayerRoundResult {
  // Session-scoped public handle (InteractiveSessionPlayer.playerId on the
  // backend). The underlying account userId never crosses the wire.
  playerId: string;
  userName: string;
  payload?: AnswerPayload | null;
  wasCorrect: boolean;
  pointsAwarded: number;
  totalScore: number;
}

export interface RoundResultPayload {
  round: number;
  element: DeckElement; // un-redacted; reveals correct answer
  playerResults: PlayerRoundResult[];
  // Populated when the round was a Best Answer round (SUBMIT → VOTE → REVEAL).
  // Carries the de-anonymized vote tallies + winner ids + bonus awarded.
  bestAnswer?: BestAnswerOutcome | null;
  // Chunk 24 — chrome the renderer needs without an extra session lookup.
  // GAME → RoundResult overlay (leaderboard chrome).
  // PRESENTATION → RoundDataView (aggregated chart, no rankings).
  format?: "GAME" | "PRESENTATION";
}

export interface SessionEndedPayload {
  placements: PlayerPlacementResponse[];
}

// ─── Chunk 24 — PRESENTATION end-of-session + host reveal/freeze ─────────────

export interface SessionSummaryRound {
  roundIndex: number;
  element: DeckElement;
  aggregatedPayloads: AnswerPayload[];
}

export interface SessionSummaryPayload {
  roundsPlayed: number;
  anyScoringEnabled: boolean;
  rounds: SessionSummaryRound[];
}

export interface ResponsesRevealedPayload {
  round: number;
  elementId: string;
}

// ─── Chunk 25 — host admin controls (end-submit / pause-resume timer) ────────

/**
 * STOMP /submissionsClosing — the host ended the submit phase. Every
 * participant device that holds an unsubmitted draft for `elementId` should
 * flush it via sendAnswer within `graceMillis` before the round freezes.
 */
export interface SubmissionsClosingPayload {
  round: number;
  elementId: string;
  graceMillis: number;
}

/**
 * STOMP /timerState — the host paused or resumed the round countdown. On
 * pause, `remainingMillis` is the time left; on resume it's null and
 * `roundStartedAt` is the freshly-shifted origin to recompute the countdown
 * from.
 */
export interface TimerStatePayload {
  round: number;
  paused: boolean;
  remainingMillis: number | null;
  roundStartedAt: string;
}

export interface WsErrorPayload {
  operation: string;
  roomCode: string;
  status: number;
  message: string;
  // Machine-readable code mirroring the REST ProblemDetail contract
  // (e.g. SESSION_NOT_FOUND / INTERNAL_ERROR). See z-docs/features/exceptions.md.
  code?: string;
}

export interface AnswerProgressPayload {
  round: number;
  // Session-scoped playerIds of players who have submitted this round.
  answeredPlayerIds: string[];
  totalPlayers: number;
}

export interface WordCloudUpdatePayload {
  round: number;
  elementId: string;
  counts: Record<string, number>;
}

export interface PresencePayload {
  userId: string;
  online: boolean;
}

/**
 * One live reaction burst the host animates in ReactionRain. The slice
 * keeps a short rolling window — components consume from the tail and the
 * window is trimmed in {@link reactionReceived} so memory doesn't grow
 * unbounded over a long game.
 */
export interface LiveReaction {
  id: string;
  emoji: string;
  userName?: string;
  /** Monotonic local timestamp (Date.now()) when the reaction was queued. */
  queuedAt: number;
}

export interface ReactionPayload {
  id: string;
  elementId?: string;
  userId?: string;
  userName?: string;
  guest?: boolean;
  emoji: string;
  offsetMs?: number;
  sentAt?: string;
}

export interface TeamUpdatePayload {
  teams: Team[];
  // Each membership is keyed by the session-scoped playerId, matching the
  // identity used everywhere else in the lobby/round broadcasts.
  memberships: { playerId: string; teamId: string }[];
}

/** Max in-flight live reactions kept in the slice. Older bursts drop off. */
const LIVE_REACTION_WINDOW = 40;
/** Max chat history retained client-side. Older messages drop off. */
const CHAT_HISTORY_WINDOW = 200;

interface InteractiveSessionState {
  roomCode: string | null;
  status: InteractiveSessionResponse["status"] | null;
  // Session-scoped playerId of the caller themselves. Latched on the first
  // setSession that carries a non-null viewerPlayerId (REST fetches set it;
  // STOMP rebroadcasts don't). Used wherever we'd previously compared against
  // the current user's userId — host detection, "is this row me", etc.
  viewerPlayerId: string | null;
  players: InteractiveSessionPlayerResponse[];
  currentElement: DeckElement | null;
  round: number;
  totalRounds: number;
  // The local player's submitted payload for this round; null until they answer.
  myAnswer: AnswerPayload | null;
  roundResult: RoundResultPayload | null;
  finalPlacements: PlayerPlacementResponse[];
  roundStartedAt: string | null;
  wsError: WsErrorPayload | null;
  // Session-scoped playerIds of players who have answered the current round.
  answeredThisRound: string[];
  // Userids who have gone offline. Sourced from the global /topic/presence
  // stream which is NOT session-scoped — so this list cannot be cross-referenced
  // against `players[].playerId` until presence broadcasts grow per-session
  // playerId resolution. The lobby/scoreboard offline indicators silently
  // no-op as a result; tracked as a follow-up to this DTO migration.
  offlineUserIds: string[];

  // ---- Best Answer phase ----
  // "SUBMIT" while players are submitting normally; "VOTE" once the server
  // broadcasts the anonymized submissions. REVEAL is implicit — when
  // roundResult arrives with bestAnswer set, render the tally on top of the
  // existing RoundResult overlay and reset phase to SUBMIT for the next round.
  phase: "SUBMIT" | "VOTE";
  voteSubmissions: AnonymizedSubmission[];
  votePhaseStartedAt: string | null;
  votePhaseSeconds: number; // 0 = unlimited
  // The local player's voted-for submissionId during VOTE phase; null until they vote.
  myVote: string | null;
  // Session-scoped playerIds who have already voted this round (drives the
  // "n of m voted" indicator).
  votedThisRound: string[];

  // Live word -> count map for the active Word Cloud round. Empty {} between
  // rounds and on every non-WordCloud round. Updated by `wordCloudUpdated`,
  // which the server emits on every submission and once on round complete.
  wordCloudCounts: Record<string, number>;

  // ---- Audience engagement (chunk 11) ----
  // Trimmed history of chat messages for this session. Initial load comes from
  // useListChatQuery; STOMP /chat broadcasts append (or patch in place when
  // the message is already present and the server is rebroadcasting a
  // moderation flip).
  chat: InteractiveSessionChatMessageResponse[];
  // Rolling window of recent reaction bursts. ReactionRain reads this and
  // animates each new entry; the window is trimmed so a long game doesn't
  // pile up megabytes of payloads in the store.
  liveReactions: LiveReaction[];

  // ---- Teams (chunk 12) ----
  // Mirrors InteractiveSessionResponse.teams; TeamUpdateMessage broadcasts patch
  // both this and the per-player teamId in place so the lobby + scoreboard
  // re-render without refetching the whole session.
  teams: Team[];
  teamMode: boolean;
  autoBalanceTeams: boolean;

  // ---- Chunk 24 — session chrome + host overlays ----
  // `format` is frozen on the InteractiveSession at create time. Mirrored
  // here so PlayPage / ResultsPage can switch shells without waiting for the
  // RTK Query `getInteractiveSession` cache to repopulate.
  format: "GAME" | "PRESENTATION";
  // elementIds the host has explicitly revealed (ON_CLICK reveal-now). The
  // backend ResponsesRevealedMessage tracks one-shot per element per session;
  // we keep a Set so the player + host UIs can flip from "waiting" to "shown"
  // without an extra fetch.
  revealedElementIds: string[];
  // elementId → "FROZEN" overlay. Host-only state: when the host clicks
  // Freeze, we mark the element here so the toggle reflects current state.
  // Player rejections come back as WsErrors from submitAnswer, so they don't
  // need to consult this map.
  frozenElementIds: string[];
  // PRESENTATION end-of-session aggregated payload. Populated from
  // SessionSummaryMessage on /summary; null until the host ends the session.
  sessionSummary: SessionSummaryPayload | null;

  // ---- Chunk 25 — host timer-pause + end-submit ----
  // Mirror of the session's timer-pause overlay. timerPaused freezes the
  // countdown; timerRemainingMillis is the time left at the pause point (null
  // while running). Latched from the DTO on setSession and kept live by the
  // /timerState broadcast.
  timerPaused: boolean;
  timerRemainingMillis: number | null;
  // One-shot signal that the host ended the submit phase. The active board
  // content component watches `nonce` and flushes its draft answer for
  // `elementId`, then clears this via submissionsClosingConsumed. Null when no
  // close is in flight.
  submissionsClosing: {
    elementId: string;
    graceMillis: number;
    nonce: number;
  } | null;
}

const initialState: InteractiveSessionState = {
  roomCode: null,
  status: null,
  viewerPlayerId: null,
  players: [],
  currentElement: null,
  round: 0,
  totalRounds: 0,
  myAnswer: null,
  roundResult: null,
  finalPlacements: [],
  roundStartedAt: null,
  wsError: null,
  answeredThisRound: [],
  offlineUserIds: [],
  phase: "SUBMIT",
  voteSubmissions: [],
  votePhaseStartedAt: null,
  votePhaseSeconds: 0,
  myVote: null,
  votedThisRound: [],
  wordCloudCounts: {},
  chat: [],
  liveReactions: [],
  teams: [],
  teamMode: false,
  autoBalanceTeams: false,
  format: "GAME",
  revealedElementIds: [],
  frozenElementIds: [],
  sessionSummary: null,
  timerPaused: false,
  timerRemainingMillis: null,
  submissionsClosing: null,
};

export const interactiveSessionSlice = createSlice({
  name: "interactiveSession",
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<InteractiveSessionResponse>) {
      const s = action.payload;
      state.roomCode = s.roomCode;
      state.status = s.status;
      // Latch viewerPlayerId on the first non-null value. REST responses
      // populate it via InteractiveSessionResponse.forViewer; STOMP /lobby
      // rebroadcasts always send null (no per-viewer context) so we must
      // preserve the previously-seen identity across those.
      if (s.viewerPlayerId) {
        state.viewerPlayerId = s.viewerPlayerId;
      }
      state.players = s.players;
      // totalRounds is a top-level derived count (== deckSnapshot.size()); the
      // settings object no longer carries it.
      state.totalRounds = s.totalRounds;
      state.round = s.currentRound;
      state.teams = s.teams;
      state.teamMode = s.settings.teamMode ?? false;
      state.autoBalanceTeams = s.settings.autoBalanceTeams ?? false;
      // Chunk 24 — format is frozen on the session at create time and always
      // present on the DTO; drives which chrome (GAME vs PRESENTATION) renders.
      state.format = s.format;
      // Chunk 24 — host overlays are persisted on the session document so a
      // host reconnect/refresh rebuilds reveal + freeze state from the DTO
      // instead of waiting for the next broadcast. STOMP messages still keep
      // the slice in sync once we're live; this just gives us a correct
      // starting point.
      state.revealedElementIds = s.revealedElementIds;
      const overrides = s.elementResponseModeOverrides;
      state.frozenElementIds = Object.entries(overrides)
        .filter(([, mode]) => mode === "NOT_ACCEPTING_RESPONSES")
        .map(([elementId]) => elementId);
      // Chunk 25 — rebuild timer-pause state from the DTO so a host reconnect
      // (or a device joining mid-round) starts paused if the round is paused.
      state.timerPaused = s.timerPaused;
      state.timerRemainingMillis = s.timerRemainingMillis ?? null;
    },

    roundStarted(state, action: PayloadAction<RoundStartPayload>) {
      state.status = "IN_PROGRESS";
      state.round = action.payload.round;
      state.totalRounds = action.payload.totalRounds;
      state.currentElement = action.payload.element;
      state.roundStartedAt = action.payload.startedAt;
      state.myAnswer = null;
      state.roundResult = null;
      state.answeredThisRound = [];
      // Reset vote-phase state at the top of every round; the server will tell
      // us to enter VOTE phase if this round is a Best Answer round.
      state.phase = "SUBMIT";
      state.voteSubmissions = [];
      state.votePhaseStartedAt = null;
      state.votePhaseSeconds = 0;
      state.myVote = null;
      state.votedThisRound = [];
      state.wordCloudCounts = {};
      // Chunk 25 — a fresh round clears any pause/closing state from the last.
      state.timerPaused = false;
      state.timerRemainingMillis = null;
      state.submissionsClosing = null;
    },

    votePhaseStarted(state, action: PayloadAction<VotePhaseStartPayload>) {
      // Stale broadcasts (e.g. server retried after round advance) are dropped.
      if (action.payload.round !== state.round) return;
      state.phase = "VOTE";
      state.voteSubmissions = action.payload.submissions;
      state.votePhaseStartedAt = action.payload.phaseStartedAt;
      state.votePhaseSeconds = action.payload.timePerVote;
      state.myVote = null;
      state.votedThisRound = [];
    },

    /** Local-only: record what the player voted for so we can disable input. */
    voteSubmittedLocally(state, action: PayloadAction<string>) {
      state.myVote = action.payload;
    },

    voteProgressReceived(state, action: PayloadAction<VoteProgressPayload>) {
      if (action.payload.round !== state.round) return;
      state.votedThisRound = action.payload.votedPlayerIds;
    },

    /** Local-only: record what the player submitted so we can disable inputs etc. */
    answerSubmittedLocally(state, action: PayloadAction<AnswerPayload>) {
      state.myAnswer = action.payload;
    },

    answerProgressReceived(
      state,
      action: PayloadAction<AnswerProgressPayload>,
    ) {
      if (action.payload.round !== state.round) return;
      state.answeredThisRound = action.payload.answeredPlayerIds;
    },

    wordCloudUpdated(state, action: PayloadAction<WordCloudUpdatePayload>) {
      // Stale broadcasts from a previous round are dropped.
      if (action.payload.round !== state.round) return;
      // Element id guards against an out-of-order broadcast landing after the
      // round advanced to a new element with the same round number.
      if (
        state.currentElement &&
        state.currentElement.id !== action.payload.elementId
      ) {
        return;
      }
      state.wordCloudCounts = action.payload.counts;
    },

    presenceUpdated(state, action: PayloadAction<PresencePayload>) {
      const { userId, online } = action.payload;
      if (online) {
        state.offlineUserIds = state.offlineUserIds.filter(
          (id) => id !== userId,
        );
      } else if (!state.offlineUserIds.includes(userId)) {
        state.offlineUserIds.push(userId);
      }
    },

    roundResultReceived(state, action: PayloadAction<RoundResultPayload>) {
      state.roundResult = action.payload;
      for (const pr of action.payload.playerResults) {
        const player = state.players.find((p) => p.playerId === pr.playerId);
        if (player) player.score = pr.totalScore;
      }
      // Best Answer round just revealed → drop the VOTE-phase scaffolding so
      // the picker UI unmounts. The reveal lives on roundResult.bestAnswer.
      state.phase = "SUBMIT";
      state.voteSubmissions = [];
      state.votePhaseStartedAt = null;
    },

    sessionEnded(state, action: PayloadAction<SessionEndedPayload>) {
      state.status = "FINISHED";
      state.finalPlacements = action.payload.placements;
      state.currentElement = null;
    },

    /**
     * PRESENTATION end-of-session payload. Mutually exclusive with
     * sessionEnded on the wire: a GAME session emits placements,
     * PRESENTATION emits aggregated rounds. Clients subscribe to both topics
     * and only one fires per session.
     */
    sessionSummaryReceived(
      state,
      action: PayloadAction<SessionSummaryPayload>,
    ) {
      state.status = "FINISHED";
      state.sessionSummary = action.payload;
      state.currentElement = null;
    },

    /**
     * Host clicked Reveal on an ON_CLICK round. Track the elementId so the
     * player + host UIs can flip from "waiting for host" to "showing
     * responses." Server is idempotent — duplicates are no-ops here too.
     */
    responsesRevealed(state, action: PayloadAction<ResponsesRevealedPayload>) {
      const { elementId } = action.payload;
      if (!state.revealedElementIds.includes(elementId)) {
        state.revealedElementIds.push(elementId);
      }
    },

    /**
     * Host-local mirror of freeze state. The server stores the override map
     * on the session but doesn't expose it via the DTO, so the host tracks
     * the toggle here. Player-side, attempting to submit while frozen comes
     * back as a WsError from /answer rather than being read off this map.
     */
    freezeStateChanged(
      state,
      action: PayloadAction<{ elementId: string; frozen: boolean }>,
    ) {
      const { elementId, frozen } = action.payload;
      const idx = state.frozenElementIds.indexOf(elementId);
      if (frozen && idx < 0) state.frozenElementIds.push(elementId);
      if (!frozen && idx >= 0) state.frozenElementIds.splice(idx, 1);
    },

    /**
     * Chunk 25 — host paused/resumed the round countdown. The /timerState
     * broadcast is authoritative; we also re-anchor roundStartedAt on resume so
     * the countdown component recomputes from the shifted origin.
     */
    timerStateReceived(state, action: PayloadAction<TimerStatePayload>) {
      if (action.payload.round !== state.round) return;
      state.timerPaused = action.payload.paused;
      state.timerRemainingMillis = action.payload.remainingMillis;
      state.roundStartedAt = action.payload.roundStartedAt;
    },

    /**
     * Chunk 25 — host ended the submit phase. Raise a one-shot signal (bumped
     * `nonce`) the active board content component watches so it can flush a
     * typed-but-unsubmitted draft before the round freezes. Stale broadcasts
     * for a different round are dropped.
     */
    submissionsClosingReceived(
      state,
      action: PayloadAction<SubmissionsClosingPayload>,
    ) {
      if (action.payload.round !== state.round) return;
      state.submissionsClosing = {
        elementId: action.payload.elementId,
        graceMillis: action.payload.graceMillis,
        nonce: Date.now(),
      };
    },

    /** Cleared by the content component once it has flushed (or had nothing to flush). */
    submissionsClosingConsumed(state) {
      state.submissionsClosing = null;
    },

    wsErrorReceived(state, action: PayloadAction<WsErrorPayload>) {
      state.wsError = action.payload;
    },

    clearWsError(state) {
      state.wsError = null;
    },

    /**
     * Seed chat history on PlayPage/Lobby mount. Replaces the current
     * client-side buffer; trims to the retention window so a host hopping
     * between sessions doesn't accumulate stale rows.
     */
    chatHistoryLoaded(
      state,
      action: PayloadAction<InteractiveSessionChatMessageResponse[]>,
    ) {
      const sorted = [...action.payload].sort((a, b) => {
        const ta = a.sentAt ? new Date(a.sentAt).getTime() : 0;
        const tb = b.sentAt ? new Date(b.sentAt).getTime() : 0;
        return ta - tb;
      });
      state.chat = sorted.slice(-CHAT_HISTORY_WINDOW);
    },

    /**
     * STOMP /chat broadcast. Used for both new sends AND moderation flips —
     * the server rebroadcasts the same DTO with moderated=true when the host
     * hides a message. We dedupe on id so the optimistic send (from the
     * apiEnhancements onQueryStarted) doesn't render twice when the broadcast
     * arrives.
     */
    chatMessageReceived(
      state,
      action: PayloadAction<InteractiveSessionChatMessageResponse>,
    ) {
      const msg = action.payload;
      if (!msg.id) {
        state.chat.push(msg);
      } else {
        const idx = state.chat.findIndex((m) => m.id === msg.id);
        if (idx >= 0) state.chat[idx] = msg;
        else state.chat.push(msg);
      }
      if (state.chat.length > CHAT_HISTORY_WINDOW) {
        state.chat = state.chat.slice(-CHAT_HISTORY_WINDOW);
      }
    },

    /**
     * STOMP /reaction burst. Appends to the rolling window — ReactionRain
     * subscribes via useAppSelector and animates each new entry. Older entries
     * fall off when the window is exceeded; the host view itself drops the
     * DOM nodes when the CSS animation completes.
     */
    reactionReceived(state, action: PayloadAction<ReactionPayload>) {
      const p = action.payload;
      state.liveReactions.push({
        id: p.id,
        emoji: p.emoji,
        userName: p.userName,
        queuedAt: Date.now(),
      });
      if (state.liveReactions.length > LIVE_REACTION_WINDOW) {
        state.liveReactions = state.liveReactions.slice(-LIVE_REACTION_WINDOW);
      }
    },

    /**
     * Drops a single live reaction once ReactionRain finishes animating it.
     * Keeps the slice from holding onto already-rendered entries.
     */
    reactionConsumed(state, action: PayloadAction<string>) {
      state.liveReactions = state.liveReactions.filter(
        (r) => r.id !== action.payload,
      );
    },

    /**
     * STOMP /teams broadcast. Replaces the team list outright and patches the
     * teamId on every affected player in place; clients reconcile from this
     * snapshot rather than merging deltas.
     */
    teamUpdateReceived(state, action: PayloadAction<TeamUpdatePayload>) {
      state.teams = action.payload.teams;
      const byPlayerId = new Map(
        action.payload.memberships.map((m) => [m.playerId, m.teamId]),
      );
      for (const player of state.players) {
        if (player.playerId && byPlayerId.has(player.playerId)) {
          player.teamId = byPlayerId.get(player.playerId) ?? undefined;
        }
      }
    },

    resetSession() {
      return initialState;
    },
  },
});

export const {
  setSession,
  roundStarted,
  answerSubmittedLocally,
  answerProgressReceived,
  presenceUpdated,
  roundResultReceived,
  sessionEnded,
  wsErrorReceived,
  clearWsError,
  resetSession,
  votePhaseStarted,
  voteSubmittedLocally,
  voteProgressReceived,
  wordCloudUpdated,
  chatHistoryLoaded,
  chatMessageReceived,
  reactionReceived,
  reactionConsumed,
  teamUpdateReceived,
  sessionSummaryReceived,
  responsesRevealed,
  freezeStateChanged,
  timerStateReceived,
  submissionsClosingReceived,
  submissionsClosingConsumed,
} = interactiveSessionSlice.actions;

export default interactiveSessionSlice.reducer;
