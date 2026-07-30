// Covers the provider's snapshot channel for per-participant follow-up data:
// when a follow-up round opens over the socket, the client refetches the
// snapshot once (the only carrier of `myFollowUpOptionId`) and re-seeds; an
// ordinary round never triggers a refetch.
import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Provider } from "react-redux";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { apiBaseUrl, emptySplitApi } from "@/shared/store/emptyApi";

import type { SessionSnapshotResponse, SlideView } from "../../store/liveSessionApi.gen";
import type { SessionEvent, SessionEventEnvelope } from "../../store/liveSessionEvents";
import { liveSessionReducer } from "../../store/liveSessionSlice";
import { SessionConnectionProvider } from "./SessionConnectionProvider";

// The socket is stubbed so the test can hand the provider an event directly.
const { openSocketSpy, socketHandlers } = vi.hoisted(() => ({
  openSocketSpy: vi.fn(),
  socketHandlers: { onEvent: undefined as ((e: SessionEventEnvelope) => void) | undefined },
}));
vi.mock("../../store/liveSessionSocket", () => ({
  openLiveSessionSocket: (publicId: string, handlers: { onEvent: (e: SessionEventEnvelope) => void }) => {
    openSocketSpy(publicId);
    socketHandlers.onEvent = handlers.onEvent;
    return () => {
      socketHandlers.onEvent = undefined;
    };
  },
}));

const SESSION_ID = "sess-1";

const followUpSlide: SlideView = {
  id: "slide-fu",
  title: "Which answer was best?",
  contentType: "FOLLOW_UP",
  followUp: {
    mode: "BEST_ANSWER_VOTE",
    parentSlideId: "slide-1",
    parentTitle: "Q1",
    options: [{ optionId: "opt-a", text: "mine" }],
  },
};

const snapshot = (over: Partial<SessionSnapshotResponse> = {}): SessionSnapshotResponse => ({
  sessionId: SESSION_ID,
  publicId: "pub-1",
  roomCode: "ROOMCODE",
  status: "IN_PROGRESS",
  phase: "SUBMIT",
  currentSlideId: "slide-1",
  currentSlide: { id: "slide-1", title: "Q1", contentType: "TEXT" },
  currentRoundStartedAt: "2026-07-01T10:00:00Z",
  roster: [],
  scoreboard: [],
  viewerParticipantId: "player-2",
  viewerIsHost: false,
  lastSequence: 1,
  ...over,
});

const roundStarted = (slide: SlideView, startedAt: string): SessionEvent => ({
  type: "RoundStarted",
  slideId: slide.id ?? "",
  slide,
  roundStartedAt: startedAt,
  deadline: null,
});

const roundRestarted = (slideId: string, startedAt: string): SessionEvent => ({
  type: "RoundRestarted",
  slideId,
  phase: "SUBMIT",
  roundStartedAt: startedAt,
  deadline: null,
});

// The state the server would report once that round is open.
let served: SessionSnapshotResponse = snapshot();
let snapshotRequests = 0;

const server = setupServer(
  http.get(`${apiBaseUrl}/api/liveSessions/${SESSION_ID}`, () => {
    snapshotRequests += 1;
    return HttpResponse.json(served);
  }),
  http.post(`${apiBaseUrl}/api/liveSessions/${SESSION_ID}/heartbeat`, () =>
    HttpResponse.json(null, { status: 204 }),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
beforeEach(() => {
  served = snapshot();
  snapshotRequests = 0;
});
afterEach(() => {
  server.resetHandlers();
  openSocketSpy.mockClear();
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: {
      [emptySplitApi.reducerPath]: emptySplitApi.reducer,
      liveSession: liveSessionReducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

// Render the provider and wait until the first snapshot has seeded the store.
const renderProvider = async () => {
  const store = makeStore();
  render(
    <Provider store={store}>
      <SessionConnectionProvider sessionId={SESSION_ID}>
        <div>board</div>
      </SessionConnectionProvider>
    </Provider>,
  );
  await screen.findByText("board");
  await waitFor(() => {
    expect(socketHandlers.onEvent).toBeDefined();
  });
  return store;
};

// Deliver one envelope the way the socket would.
const deliver = (sequence: number, event: SessionEvent) => {
  socketHandlers.onEvent?.({
    eventId: `evt-${sequence}`,
    sequence,
    occurredAt: "2026-07-01T10:05:00Z",
    event,
  });
};

describe("SessionConnectionProvider follow-up snapshot refetch", () => {
  it("refetches the snapshot once when a follow-up round opens", async () => {
    const store = await renderProvider();
    expect(snapshotRequests).toBe(1);

    // What the server will report for the follow-up round, including the
    // per-viewer candidate that no broadcast can carry.
    served = snapshot({
      currentSlideId: "slide-fu",
      currentSlide: followUpSlide,
      currentRoundStartedAt: "2026-07-01T10:05:00Z",
      myFollowUpOptionId: "opt-a",
      lastSequence: 2,
    });
    deliver(2, roundStarted(followUpSlide, "2026-07-01T10:05:00Z"));

    // The event alone leaves the viewer's own candidate unknown…
    await waitFor(() => {
      expect(store.getState().liveSession.currentSlideId).toBe("slide-fu");
    });
    // …until the refetched snapshot re-seeds it.
    await waitFor(() => {
      expect(store.getState().liveSession.myFollowUpOptionId).toBe("opt-a");
    });
    expect(snapshotRequests).toBe(2);

    // The re-seed doesn't re-arm the effect: still exactly one refetch.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(snapshotRequests).toBe(2);
  });

  it("refetches again when the same follow-up round restarts", async () => {
    const store = await renderProvider();
    expect(snapshotRequests).toBe(1);

    // Open the follow-up round first — same setup as the "opens" case above.
    served = snapshot({
      currentSlideId: "slide-fu",
      currentSlide: followUpSlide,
      currentRoundStartedAt: "2026-07-01T10:05:00Z",
      myFollowUpOptionId: "opt-a",
      lastSequence: 2,
    });
    deliver(2, roundStarted(followUpSlide, "2026-07-01T10:05:00Z"));
    await waitFor(() => {
      expect(store.getState().liveSession.myFollowUpOptionId).toBe("opt-a");
    });
    expect(snapshotRequests).toBe(2);

    // The host restarts the SAME follow-up slide: fresh candidates (a new
    // `myFollowUpOptionId`) under a new `roundStartedAt`. The guard key
    // (`${slideId}@${roundStartedAt}`) must see this as a new round even
    // though the slide id hasn't changed, and fire a second refetch.
    served = snapshot({
      currentSlideId: "slide-fu",
      currentSlide: followUpSlide,
      currentRoundStartedAt: "2026-07-01T10:06:00Z",
      myFollowUpOptionId: "opt-b",
      lastSequence: 3,
    });
    deliver(3, roundRestarted("slide-fu", "2026-07-01T10:06:00Z"));

    await waitFor(() => {
      expect(store.getState().liveSession.roundStartedAt).toBe("2026-07-01T10:06:00Z");
    });
    await waitFor(() => {
      expect(store.getState().liveSession.myFollowUpOptionId).toBe("opt-b");
    });
    expect(snapshotRequests).toBe(3);

    // The re-seed doesn't re-arm the effect: still exactly two refetches total.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(snapshotRequests).toBe(3);
  });

  it("does not refetch when an ordinary round opens", async () => {
    const store = await renderProvider();
    expect(snapshotRequests).toBe(1);

    deliver(
      2,
      roundStarted({ id: "slide-2", title: "Q2", contentType: "MCQ" }, "2026-07-01T10:05:00Z"),
    );

    await waitFor(() => {
      expect(store.getState().liveSession.currentSlideId).toBe("slide-2");
    });
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(snapshotRequests).toBe(1);
  });

  it("does not refetch for a follow-up round the snapshot already described", async () => {
    // A late joiner lands directly on the open follow-up round: its snapshot
    // already carries the field, so nothing more is fetched.
    served = snapshot({
      currentSlideId: "slide-fu",
      currentSlide: followUpSlide,
      currentRoundStartedAt: "2026-07-01T10:05:00Z",
      myFollowUpOptionId: "opt-a",
    });
    const store = await renderProvider();

    expect(store.getState().liveSession.myFollowUpOptionId).toBe("opt-a");
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(snapshotRequests).toBe(1);
  });
});
