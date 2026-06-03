// Context for the session's STOMP send actions, kept in its own (non-component)
// module so the provider file can stay component-only for fast refresh.
// SessionConnectionProvider supplies the value; consumers (SessionControls)
// read it via useSessionConnection.
import { createContext, use } from "react";
import type { AnswerPayload } from "@types/elements";

// TODO(migration): stubbed pending liveSession migration. The real shape is
// ReturnType<typeof useInteractiveSessionWebSocket>; this placeholder preserves
// the send-action surface consumers depend on until the hook is rebuilt.
export interface SessionConnection {
  sendStart: () => void;
  sendAnswer: (elementId: string, payload: AnswerPayload) => void;
  sendVote: (elementId: string, submissionId: string) => void;
  sendNextRound: () => void;
  sendLeave: () => void;
  sendBoot: (playerId: string) => void;
  sendEndInteractiveSession: () => void;
  sendRevealNow: (elementId: string) => void;
  sendFreezeResponses: (elementId: string, frozen: boolean) => void;
  sendEndSubmitPhase: (elementId: string) => void;
  sendRestart: () => void;
  sendPauseTimer: () => void;
  sendResumeTimer: () => void;
  sendChat: (body: string) => void;
  sendReaction: (emoji: string) => void;
}

export const SessionConnectionContext = createContext<SessionConnection | null>(
  null,
);

/** Access the session's STOMP send actions. Must be used within the provider. */
export const useSessionConnection = (): SessionConnection => {
  const ctx = use(SessionConnectionContext);
  if (!ctx) {
    throw new Error(
      "useSessionConnection must be used within a SessionConnectionProvider",
    );
  }
  return ctx;
};
