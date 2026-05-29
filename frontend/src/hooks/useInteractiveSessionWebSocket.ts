/**
 * Manages the STOMP/WebSocket connection for an active InteractiveSession.
 * Subscribes to every session topic (driven by the SESSION_TOPICS table below),
 * dispatches payloads into the Redux session slice, and exposes helper functions
 * for sending host/player actions. Sends fired while the socket is mid-reconnect
 * are queued and flushed on connect rather than silently dropped.
 */
import { useEffect, useRef, useCallback } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import { apiBaseUrl } from "../store/emptyApi";
import { useAppDispatch } from "../store/hooks";
import type { AppDispatch } from "../store/store";
import {
  setSession,
  roundStarted,
  roundResultReceived,
  sessionEnded,
  wsErrorReceived,
  answerProgressReceived,
  presenceUpdated,
  votePhaseStarted,
  voteProgressReceived,
  wordCloudUpdated,
  chatMessageReceived,
  reactionReceived,
  teamUpdateReceived,
  sessionSummaryReceived,
  responsesRevealed,
  freezeStateChanged,
  timerStateReceived,
  submissionsClosingReceived,
  type RoundStartPayload,
  type RoundResultPayload,
  type SessionEndedPayload,
  type WsErrorPayload,
  type AnswerProgressPayload,
  type PresencePayload,
  type WordCloudUpdatePayload,
  type ReactionPayload,
  type TeamUpdatePayload,
  type SessionSummaryPayload,
  type ResponsesRevealedPayload,
  type TimerStatePayload,
  type SubmissionsClosingPayload,
} from "../store/interactiveSessionSlice";
import type {
  InteractiveSessionResponse,
  InteractiveSessionChatMessageResponse,
} from "../store/AmbiApi";
import type { AnswerPayload } from "../types/elements";
import type {
  VotePhaseStartPayload,
  VoteProgressPayload,
} from "../types/bestAnswer";

// Every session-scoped STOMP topic, mapped to the slice action its JSON payload
// feeds. Kept as data (rather than ~15 near-identical inline subscribe blocks)
// so verifying "is every backend broadcast subscribed?" is a one-glance diff
// against the broadcast topics in InteractiveSessionService. All of these live
// under `/topic/interactive-session/{roomCode}/<suffix>`; the two
// non-session-scoped destinations (/topic/presence, /user/queue/errors) are
// subscribed separately in onConnect.
type TopicHandler = (dispatch: AppDispatch, body: unknown) => void;

const SESSION_TOPICS: Record<string, TopicHandler> = {
  lobby: (d, b) => {
    d(setSession(b as InteractiveSessionResponse));
  },
  round: (d, b) => {
    d(roundStarted(b as RoundStartPayload));
  },
  roundResult: (d, b) => {
    d(roundResultReceived(b as RoundResultPayload));
  },
  ended: (d, b) => {
    d(sessionEnded(b as SessionEndedPayload));
  },
  answered: (d, b) => {
    d(answerProgressReceived(b as AnswerProgressPayload));
  },
  votePhase: (d, b) => {
    d(votePhaseStarted(b as VotePhaseStartPayload));
  },
  voted: (d, b) => {
    d(voteProgressReceived(b as VoteProgressPayload));
  },
  wordCloud: (d, b) => {
    d(wordCloudUpdated(b as WordCloudUpdatePayload));
  },
  // Chunk 11 — chat carries both new sends AND moderation flips; the slice
  // dedupes on message id so a moderated rebroadcast updates the row in place.
  chat: (d, b) => {
    d(chatMessageReceived(b as InteractiveSessionChatMessageResponse));
  },
  // Chunk 11 — emoji bursts feed ReactionRain on the host view.
  reaction: (d, b) => {
    d(reactionReceived(b as ReactionPayload));
  },
  // Chunk 12 — full team list + membership map on every change; clients
  // replace state rather than merging deltas.
  teams: (d, b) => {
    d(teamUpdateReceived(b as TeamUpdatePayload));
  },
  // Chunk 24 — PRESENTATION end-of-session aggregation. Mutually exclusive with
  // /ended on the wire: subscribing to both is safe because the server emits
  // only one per session based on the frozen SessionFormat.
  summary: (d, b) => {
    d(sessionSummaryReceived(b as SessionSummaryPayload));
  },
  // Chunk 24 — host revealed an ON_CLICK round. One-shot per element per
  // session; the slice keeps the elementId so UIs flip "waiting" → "showing".
  responsesRevealed: (d, b) => {
    d(responsesRevealed(b as ResponsesRevealedPayload));
  },
  // Chunk 25 — host admin controls. submissionsClosing tells participant devices
  // to flush their drafts when the submit phase ends; timerState flips the
  // countdown on pause/resume.
  submissionsClosing: (d, b) => {
    d(submissionsClosingReceived(b as SubmissionsClosingPayload));
  },
  timerState: (d, b) => {
    d(timerStateReceived(b as TimerStatePayload));
  },
};

const publishTo = (client: Client, destination: string, body?: object) => {
  client.publish({
    destination,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
};

export function useInteractiveSessionWebSocket(roomCode: string | null) {
  const dispatch = useAppDispatch();
  const clientRef = useRef<Client | null>(null);
  // Sends fired while the socket is down (e.g. a host hitting Start during the
  // 3 s reconnect window) are buffered here and flushed on the next connect, so
  // host control actions aren't silently lost (§1e).
  const pendingRef = useRef<{ destination: string; body?: object }[]>([]);

  useEffect(() => {
    if (!roomCode) return;

    const client = new Client({
      webSocketFactory: () => new SockJS(`${apiBaseUrl}/ws`),
      reconnectDelay: 3000,
      onConnect: () => {
        for (const [suffix, toAction] of Object.entries(SESSION_TOPICS)) {
          client.subscribe(
            `/topic/interactive-session/${roomCode}/${suffix}`,
            (msg) => {
              const body: unknown = JSON.parse(msg.body);
              toAction(dispatch, body);
            },
          );
        }
        // Not session-scoped: the global presence stream and this client's
        // private error queue.
        client.subscribe(`/topic/presence`, (msg) => {
          dispatch(presenceUpdated(JSON.parse(msg.body) as PresencePayload));
        });
        client.subscribe(`/user/queue/errors`, (msg) => {
          dispatch(wsErrorReceived(JSON.parse(msg.body) as WsErrorPayload));
        });
        // Flush anything queued while we were disconnected.
        const queued = pendingRef.current;
        pendingRef.current = [];
        for (const msg of queued) publishTo(client, msg.destination, msg.body);
      },
    });

    clientRef.current = client;
    client.activate();

    return () => {
      void client.deactivate();
      clientRef.current = null;
      // Drop buffered sends so they can't leak onto a different room's socket.
      pendingRef.current = [];
    };
  }, [roomCode, dispatch]);

  const send = useCallback((destination: string, body?: object) => {
    const client = clientRef.current;
    if (client?.connected) {
      publishTo(client, destination, body);
    } else {
      // Mid-(re)connect: queue and flush on connect instead of dropping.
      pendingRef.current.push({ destination, body });
    }
  }, []);

  return {
    sendStart: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/start`);
    }, [roomCode, send]),

    /**
     * Submit a polymorphic answer for the current element. The payload's `kind`
     * discriminator picks the server-side scoring branch.
     */
    sendAnswer: useCallback(
      (elementId: string, payload: AnswerPayload) => {
        send(`/app/interactive-session/${roomCode}/answer`, {
          elementId,
          payload,
        });
      },
      [roomCode, send],
    ),

    /** Cast a vote during the VOTE phase of a Best Answer round. */
    sendVote: useCallback(
      (elementId: string, submissionId: string) => {
        send(`/app/interactive-session/${roomCode}/vote`, {
          elementId,
          submissionId,
        });
      },
      [roomCode, send],
    ),

    sendNextRound: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/nextRound`);
    }, [roomCode, send]),

    sendLeave: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/leave`);
    }, [roomCode, send]),

    sendBoot: useCallback(
      // `playerId` is the session-scoped public handle (no raw userId on the
      // wire — see InteractiveSessionPlayer.playerId on the backend).
      (playerId: string) => {
        send(`/app/interactive-session/${roomCode}/boot`, { playerId });
      },
      [roomCode, send],
    ),

    sendEndInteractiveSession: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/end`);
    }, [roomCode, send]),

    /**
     * Chunk 24 — host manually surfaces the response distribution for the
     * current round when `showResponses` resolves to ON_CLICK. Server is
     * idempotent: only the first call per element per session actually
     * broadcasts. Wire-up also flips the slice's revealedElementIds locally
     * so the host's own button can disable immediately without a round-trip.
     */
    sendRevealNow: useCallback(
      (elementId: string) => {
        send(`/app/interactive-session/${roomCode}/reveal`, { elementId });
        dispatch(responsesRevealed({ round: 0, elementId }));
      },
      [roomCode, send, dispatch],
    ),

    /**
     * Chunk 24 — host flips the current round's response mode. Affects only
     * the current run; never mutates the deck. The slice's frozenElementIds
     * is updated locally so the host's toggle reflects state immediately
     * even before the lobby DTO rebroadcast lands.
     */
    sendFreezeResponses: useCallback(
      (elementId: string, frozen: boolean) => {
        send(`/app/interactive-session/${roomCode}/freeze`, {
          elementId,
          mode: frozen ? "NOT_ACCEPTING_RESPONSES" : "ACCEPTING_RESPONSES",
        });
        dispatch(freezeStateChanged({ elementId, frozen }));
      },
      [roomCode, send, dispatch],
    ),

    /**
     * Chunk 25 — host ends the submit phase for the current round. The server
     * broadcasts submissionsClosing (devices flush drafts), then after a grace
     * window freezes the round and reveals results.
     */
    sendEndSubmitPhase: useCallback(
      (elementId: string) => {
        send(`/app/interactive-session/${roomCode}/endSubmit`, { elementId });
      },
      [roomCode, send],
    ),

    /** Chunk 25 — host restarts the session from round 1 (keeps players, clears scores). */
    sendRestart: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/restart`);
    }, [roomCode, send]),

    /**
     * Chunk 25 — host pauses / resumes the round countdown. The authoritative
     * paused state comes back on /timerState, so no optimistic local dispatch.
     */
    sendPauseTimer: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/pauseTimer`);
    }, [roomCode, send]),

    sendResumeTimer: useCallback(() => {
      send(`/app/interactive-session/${roomCode}/resumeTimer`);
    }, [roomCode, send]),

    /**
     * Chunk 11 — audience engagement. The server persists and broadcasts both
     * of these back over /chat and /reaction, so the sender sees their own
     * message/burst via the normal slice path (no optimistic local echo needed).
     */
    sendChat: useCallback(
      (body: string) => {
        send(`/app/interactive-session/${roomCode}/chat`, { body });
      },
      [roomCode, send],
    ),

    sendReaction: useCallback(
      (emoji: string) => {
        send(`/app/interactive-session/${roomCode}/reaction`, { emoji });
      },
      [roomCode, send],
    ),
  };
}
