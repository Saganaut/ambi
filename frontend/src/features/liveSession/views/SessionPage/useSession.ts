// Live read model for the Gen-2 session page. A pure reader (no side effects):
// the SessionConnectionProvider owns the STOMP subscription + REST seed, so this
// just combines the two sources every consumer needs into one session view.
//
//   - The REST snapshot (getInteractiveSession, a shared/deduped cache) supplies
//     the frozen content: deckSnapshot, settings, host identity, room code.
//   - The interactiveSession Redux slice supplies everything that changes during
//     the session — status, round, phase, players, reveals — kept current by the
//     STOMP topics. This is why the board flips from lobby to question to results
//     without any navigation: status changes here, the board re-derives its stage.
//
// The slice is seeded from the same snapshot, so once seeded it is the source of
// truth for the live fields and the snapshot only backs the static ones.
import type {
  AnswerPayload,
  DeckElement,
} from "@types/elements";
import type { DeckResponse, InteractiveSessionResponse } from "@store/AmbiApi";
import { useGetDeckQuery, useGetInteractiveSessionQuery } from "@store/AmbiApi";
import { getRouteApi } from "@tanstack/react-router";

const routeApi = getRouteApi("/sessions/$sessionId/");

// TODO(migration): stubbed pending liveSession migration. SliceState was
// ReturnType<typeof useInteractiveSession>; this is a local placeholder of the
// live fields this hook merges, so consumers keep their existing field shapes.
interface SliceState {
  status: InteractiveSessionResponse["status"] | null;
  roomCode: string | null;
  phase: "SUBMIT" | "VOTE";
  round: number;
  totalRounds: number;
  players: InteractiveSessionResponse["players"];
  teams: InteractiveSessionResponse["teams"];
  revealedElementIds: string[];
  viewerPlayerId: string | null;
  timerPaused: boolean;
  timerRemainingMillis: number | null;
  roundResult: {
    round: number;
    element: DeckElement;
    playerResults: {
      playerId: string;
      userName: string;
      payload?: AnswerPayload | null;
      wasCorrect: boolean;
      pointsAwarded: number;
      totalScore: number;
    }[];
  } | null;
  myAnswer: AnswerPayload | null;
  submissionsClosing: {
    elementId: string;
    graceMillis: number;
    nonce: number;
  } | null;
  chat: InteractiveSessionResponse["chat"];
  liveReactions: {
    id: string;
    emoji: string;
    userName?: string;
    queuedAt: number;
  }[];
}

// TODO(migration): stubbed pending liveSession migration. With the slice gone
// the live fields default to "not yet seeded"; the merged view falls back to the
// REST snapshot until the slice is rebuilt.
const stubLive: SliceState = {
  status: null,
  roomCode: null,
  phase: "SUBMIT",
  round: 0,
  totalRounds: 0,
  players: [],
  teams: [],
  revealedElementIds: [],
  viewerPlayerId: null,
  timerPaused: false,
  timerRemainingMillis: null,
  roundResult: null,
  myAnswer: null,
  submissionsClosing: null,
  chat: [],
  liveReactions: [],
};

interface useSessionResponse {
  sessionId: string;
  interactiveSession: InteractiveSessionResponse;
  // Resolved from the session's deckId for the header title. Optional: a
  // non-host participant may not be able to read the deck, and it is briefly
  // undefined while loading.
  currentDeck?: DeckResponse;
  // Live, slice-only fields with no place on the REST DTO. Surfaced here so
  // every consumer reads one session view instead of reaching back into the
  // slice for these (which previously gave two sources for the same datum):
  //   - roundResult: the current round's scored result, once it lands. The
  //     reveal moment rides on /roundResult rather than a phase flip, so its
  //     presence is what flips the board from prompt to results.
  //   - myAnswer: this device's submitted payload for the round; null until
  //     the participant answers (and cleared at the top of each round).
  //   - submissionsClosing: the one-shot "host ended the submit phase" signal a
  //     content component watches to flush an unsubmitted draft.
  roundResult: SliceState["roundResult"];
  myAnswer: SliceState["myAnswer"];
  submissionsClosing: SliceState["submissionsClosing"];
  // Live audience-engagement feeds (chunk 11), kept current by the STOMP /chat
  // and /reaction topics: `chat` is the trimmed message history, `liveReactions`
  // the rolling window of recent emoji bursts.
  chat: SliceState["chat"];
  liveReactions: SliceState["liveReactions"];
  // Derived once here rather than recomputed per consumer. A projected host
  // screen and a participant device read the same board; this flag is the only
  // thing that differs between them.
  viewerIsHost: boolean;
}

const mergeSessionView = (
  roomCode: string,
  snapshot: InteractiveSessionResponse,
  live: SliceState,
): InteractiveSessionResponse => {
  // The slice is "seeded" once setSession has run for this room; before that the
  // REST snapshot is authoritative for live fields too.
  const seeded = live.status !== null && live.roomCode === roomCode;

  if (!seeded) return snapshot;

  return {
    ...snapshot,
    status: live.status ?? snapshot.status,
    phase: live.phase,
    currentRound: live.round,
    // Once seeded the slice owns totalRounds (setSession copies it from this
    // same snapshot, roundStarted keeps it current); 0 is a legitimate value
    // for an empty deck, so there is no snapshot fallback to swallow it.
    totalRounds: live.totalRounds,
    players: live.players,
    teams: live.teams,
    revealedElementIds: live.revealedElementIds,
    viewerPlayerId: live.viewerPlayerId ?? snapshot.viewerPlayerId,
    timerPaused: live.timerPaused,
    timerRemainingMillis: live.timerRemainingMillis ?? undefined,
  };
};

const useSession = (): useSessionResponse => {
  // The `$sessionId` route param carries the room code (the join code).
  const { sessionId: roomCode } = routeApi.useParams();
  const { data: snapshot } = useGetInteractiveSessionQuery({ roomCode });
  const live = stubLive;
  const { data: currentDeck } = useGetDeckQuery(
    { id: snapshot?.deckId ?? "" },
    { skip: !snapshot?.deckId },
  );

  // SessionConnectionProvider renders a loader until this snapshot resolves and
  // only then mounts the children that call useSession, so it is always cached
  // by the time we get here. We assert that contract at the hook boundary
  // (mirroring useSessionConnection) instead of letting an undefined snapshot
  // leak into the merged view.
  if (!snapshot) {
    throw new Error(
      "useSession must be used within a loaded SessionConnectionProvider",
    );
  }

  const interactiveSession = mergeSessionView(roomCode, snapshot, live);
  const viewerIsHost =
    !!interactiveSession.viewerPlayerId &&
    interactiveSession.viewerPlayerId === interactiveSession.hostPlayerId;

  return {
    sessionId: roomCode,
    interactiveSession,
    currentDeck,
    roundResult: live.roundResult,
    myAnswer: live.myAnswer,
    submissionsClosing: live.submissionsClosing,
    chat: live.chat,
    liveReactions: live.liveReactions,
    viewerIsHost,
  };
};

export { useSession };
