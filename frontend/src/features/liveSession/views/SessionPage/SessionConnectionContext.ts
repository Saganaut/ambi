// Context for the session's STOMP send actions, kept in its own (non-component)
// module so the provider file can stay component-only for fast refresh.
// SessionConnectionProvider supplies the value; consumers (SessionControls)
// read it via useSessionConnection.
import { createContext, use } from "react";
import type { useInteractiveSessionWebSocket } from "@hooks/useInteractiveSessionWebSocket";

export type SessionConnection = ReturnType<
  typeof useInteractiveSessionWebSocket
>;

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
