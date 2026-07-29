import type { IMessage, StompConfig, StompSubscription } from "@stomp/stompjs";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SessionEventEnvelope } from "./liveSessionEvents";
import { openLiveSessionSocket } from "./liveSessionSocket";

// The transport under test is the stompjs `Client` wiring, so the client itself
// is the seam we fake: the mock records the config it was built with and hands
// the test the callbacks (`onConnect`, the subscription handler) to fire.
const clients: FakeClient[] = [];

class FakeClient {
  readonly config: StompConfig;
  readonly subscriptions: { destination: string; handler: (m: IMessage) => void }[] = [];
  activated = false;
  deactivated = false;

  constructor(config: StompConfig) {
    this.config = config;
    clients.push(this);
  }

  activate() {
    this.activated = true;
  }

  deactivate() {
    this.deactivated = true;
    return Promise.resolve();
  }

  subscribe(destination: string, handler: (m: IMessage) => void): StompSubscription {
    this.subscriptions.push({ destination, handler });
    return { id: `sub-${this.subscriptions.length}`, unsubscribe: () => undefined };
  }
}

vi.mock("@stomp/stompjs", () => ({
  // A plain function, not an arrow: the module under test calls `new Client(…)`,
  // and deferring to the fake inside the body keeps the class reference lazy
  // (the factory is hoisted above this file's declarations).
  Client: function Client(config: StompConfig) {
    return new FakeClient(config);
  },
}));

/** Fire the connect callback the way stompjs does on a completed handshake. */
const connect = (client: FakeClient) => client.config.onConnect?.({} as never);

const message = (body: unknown) => ({ body: JSON.stringify(body) }) as IMessage;

const envelope: SessionEventEnvelope = {
  eventId: "evt-1",
  sequence: 4,
  occurredAt: "2026-07-01T10:00:00Z",
  event: { type: "SubmissionsLocked", slideId: "slide-1" },
};

describe("openLiveSessionSocket", () => {
  const handlers = {
    onEvent: vi.fn(),
    onConnectionChange: vi.fn(),
    onReconnect: vi.fn(),
  };

  /** Open a socket and hand back the fake client it built. */
  const open = (): { client: FakeClient; close: () => void } => {
    const close = openLiveSessionSocket("pub-1", handlers);
    const client = clients.at(-1);
    if (!client) throw new Error("no STOMP client was constructed");
    return { client, close };
  };

  /** Push a frame through the live subscription. */
  const deliver = (client: FakeClient, frame: IMessage) => {
    const subscription = client.subscriptions.at(-1);
    if (!subscription) throw new Error("no subscription on the session topic");
    subscription.handler(frame);
  };

  beforeEach(() => {
    clients.length = 0;
    vi.clearAllMocks();
  });

  it("subscribes to the session topic and hands over the parsed envelope", () => {
    const { client } = open();
    expect(client.activated).toBe(true);
    expect(handlers.onConnectionChange).toHaveBeenCalledWith("connecting");

    connect(client);
    expect(handlers.onConnectionChange).toHaveBeenCalledWith("connected");
    expect(client.subscriptions[0]?.destination).toBe("/topic/liveSession/pub-1");

    deliver(client, message(envelope));
    expect(handlers.onEvent).toHaveBeenCalledWith(envelope);
  });

  it("swallows an undecodable frame rather than tearing the stream down", () => {
    const { client } = open();
    connect(client);

    deliver(client, { body: "not json" } as IMessage);
    expect(handlers.onEvent).not.toHaveBeenCalled();
  });

  it("signals a reconnect only from the second connect onwards", () => {
    const { client } = open();

    connect(client);
    // The first handshake is not a reconnect — nothing was missed.
    expect(handlers.onReconnect).not.toHaveBeenCalled();

    connect(client);
    expect(handlers.onReconnect).toHaveBeenCalledTimes(1);
    // Fired after the resubscribe, so the re-seed can't land on a dead topic.
    expect(client.subscriptions).toHaveLength(2);

    connect(client);
    expect(handlers.onReconnect).toHaveBeenCalledTimes(2);
  });

  it("deactivates the client on teardown", () => {
    const { client, close } = open();
    close();

    expect(client.deactivated).toBe(true);
  });
});
