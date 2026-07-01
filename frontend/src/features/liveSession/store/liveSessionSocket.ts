// The STOMP-over-WebSocket receiver for a live session. Opens a native WebSocket
// to the backend's `/ws` endpoint (the server speaks native STOMP, not SockJS),
// subscribes to the session's per-session topic, and hands each decoded
// `SessionEvent` to the caller. Commands are never sent here — the backend is
// broadcast-only, so writes go over REST (`useLiveSessionMutate`).
//
// This module owns only the transport; it does not touch Redux. The provider
// wires `onEvent`/`onConnectionChange` to the `liveSessionSlice` so the socket
// stays a plain, testable I/O boundary.
import { Client, type IMessage } from "@stomp/stompjs";

import { logger } from "@utils/logger";

import { apiBaseUrl } from "@store/emptyApi";
import type { ConnectionState } from "./liveSessionSlice";
import type { SessionEvent } from "./liveSessionEvents";

const TOPIC_PREFIX = "/topic/liveSession/";

/** Derive the WebSocket broker URL from the REST base (http→ws, https→wss). */
const brokerUrl = (): string => `${apiBaseUrl.replace(/^http/, "ws")}/ws`;

export interface LiveSessionSocketHandlers {
  /** A decoded event arrived on the session topic. */
  onEvent: (event: SessionEvent) => void;
  /** The client's connection status changed (for a reconnecting banner, etc.). */
  onConnectionChange: (status: ConnectionState) => void;
}

/**
 * Connects to the session behind {@code publicId} and streams its events to the
 * handlers until the returned teardown is called. The client auto-reconnects; the
 * handshake carries the auth cookie automatically (same credentials as REST), so
 * no token plumbing is needed here.
 *
 * @returns a teardown that deactivates the client (call on unmount)
 */
export function openLiveSessionSocket(
  publicId: string,
  handlers: LiveSessionSocketHandlers,
): () => void {
  const client = new Client({
    brokerURL: brokerUrl(),
    // Native WebSocket; @stomp/stompjs uses the global WebSocket when brokerURL
    // is set. Reconnect on drop so a flaky network re-seeds via the provider.
    reconnectDelay: 3000,
    onConnect: () => {
      handlers.onConnectionChange("connected");
      client.subscribe(`${TOPIC_PREFIX}${publicId}`, (message: IMessage) => {
        try {
          handlers.onEvent(JSON.parse(message.body) as SessionEvent);
        } catch (err) {
          logger.error("Failed to parse live-session event", { err });
        }
      });
    },
    onWebSocketClose: () => handlers.onConnectionChange("disconnected"),
    onStompError: (frame) => {
      // Broker-reported error (e.g. a rejected SUBSCRIBE) — the connection stays
      // up but the subscription failed; surface it rather than silently stalling.
      logger.error("Live-session STOMP error", {
        message: frame.headers.message,
        body: frame.body,
      });
    },
  });

  handlers.onConnectionChange("connecting");
  client.activate();

  return () => {
    void client.deactivate();
  };
}
