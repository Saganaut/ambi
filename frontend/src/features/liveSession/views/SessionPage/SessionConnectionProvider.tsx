// TODO(migration): stubbed pending liveSession migration.
//
// This provider's core job — opening the STOMP subscription
// (useInteractiveSessionWebSocket) and seeding the interactiveSession slice — is
// gone with those modules. Until they're rebuilt it supplies a no-op connection
// value so consumers (SessionControls, SessionChat, McqBoardContent) still
// resolve useSessionConnection, and renders its children directly.
import { type ReactNode } from "react";

import { SessionConnectionContext } from "./SessionConnectionContext";
import type { SessionConnection } from "./SessionConnectionContext";

interface SessionConnectionProviderProps {
  /** The room code — carried by the `$sessionId` route param. */
  roomCode: string;
  children: ReactNode;
}

const noopConnection: SessionConnection = {
  sendStart: () => {},
  sendAnswer: () => {},
  sendVote: () => {},
  sendNextRound: () => {},
  sendLeave: () => {},
  sendBoot: () => {},
  sendEndInteractiveSession: () => {},
  sendRevealNow: () => {},
  sendFreezeResponses: () => {},
  sendEndSubmitPhase: () => {},
  sendRestart: () => {},
  sendPauseTimer: () => {},
  sendResumeTimer: () => {},
  sendChat: () => {},
  sendReaction: () => {},
};

const SessionConnectionProvider = ({
  children,
}: SessionConnectionProviderProps) => {
  return (
    <SessionConnectionContext value={noopConnection}>
      {children}
    </SessionConnectionContext>
  );
};

export { SessionConnectionProvider };
