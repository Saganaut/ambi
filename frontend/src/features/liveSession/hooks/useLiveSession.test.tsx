// Pins the "Start" (present) flow of the live-session view-model: `present`
// creates a session (POST /api/liveSessions), tracks its in-flight state on
// `isStarting`, navigates to the new session on success, and surfaces a
// user-readable `startError` on failure without navigating.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
// Importing the generated api registers the `create`/`join` endpoints onto the
// shared empty api so the mutate hook underneath `useLiveSession` can fire them.
import "../store/liveSessionApi.gen";
import { useLiveSession } from "./useLiveSession";

// `useLiveSession` owns navigation; stub the router so we can assert where it
// sends the host after a session is created.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  useNavigate: () => navigateSpy,
}));

const DECK_ID = "deck-1";
const SESSION_ID = "session-42";

const server = setupServer(
  http.post(`${apiBaseUrl}/api/liveSessions`, () =>
    HttpResponse.json({ sessionId: SESSION_ID }, { status: 201 }),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  navigateSpy.mockClear();
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

const renderUseLiveSession = () => {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useLiveSession(), { wrapper }).result;
};

describe("useLiveSession.present", () => {
  it("creates a session, tracks isStarting, then navigates to it", async () => {
    const result = renderUseLiveSession();
    expect(result.current.isStarting).toBe(false);
    expect(result.current.startError).toBeNull();

    let pending: Promise<void>;
    act(() => {
      pending = result.current.present(DECK_ID);
    });

    // The create request is in flight: the button reports "Starting…".
    await waitFor(() => expect(result.current.isStarting).toBe(true));

    await act(async () => {
      await pending;
    });

    expect(result.current.isStarting).toBe(false);
    expect(result.current.startError).toBeNull();
    expect(navigateSpy).toHaveBeenCalledWith({
      to: "/sessions/$sessionId",
      params: { sessionId: SESSION_ID },
    });
  });

  it("surfaces a startError and does not navigate when create fails", async () => {
    server.use(
      http.post(`${apiBaseUrl}/api/liveSessions`, () =>
        HttpResponse.json({ detail: "Deck not found" }, { status: 404 }),
      ),
    );

    const result = renderUseLiveSession();

    await act(async () => {
      await result.current.present(DECK_ID);
    });

    expect(result.current.isStarting).toBe(false);
    expect(result.current.startError).toBe("Deck not found");
    expect(navigateSpy).not.toHaveBeenCalled();
  });
});
