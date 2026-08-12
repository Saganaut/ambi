// Pins the de-duplication contract of deck creation: the id is minted client-side,
// so a burst of clicks across the two "New deck" affordances (header button and grid
// tile — separate hook instances) would otherwise PUT a fresh id per click and leave
// a pile of empty decks behind. One create per burst, a shared busy flag both
// instances see, and a failed create that stays retryable with a fresh id.
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
  vi,
} from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { apiBaseUrl } from "@/shared/store/emptyApi";

// Creation navigates to the new deck's editor; stub the router so the hook can run
// outside a route tree.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useNavigate: () => navigateSpy }),
  useNavigate: () => navigateSpy,
}));

const deckResponse = (id: string) => ({
  id,
  publicId: `pub-${id}`,
  name: "Untitled Deck",
  version: 1,
  creatorUserId: "u1",
  originalAuthorUserId: "u1",
  tags: [],
  acl: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
});

let putIds: string[] = [];
let failNextPut = false;

const server = setupServer(
  http.put(`${apiBaseUrl}/api/decks/:id`, ({ params }) => {
    const id = String(params.id);
    putIds.push(id);
    if (failNextPut) {
      failNextPut = false;
      return HttpResponse.json({ status: 500, title: "boom" }, { status: 500 });
    }
    return HttpResponse.json(deckResponse(id));
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  putIds = [];
  failNextPut = false;
  navigateSpy.mockReset();
});
afterAll(() => {
  server.close();
});

// The in-flight create is module-level state shared by every hook instance, so each
// test pulls a fresh copy of the module graph (store included, so the hook and the
// test agree on which api instance they are talking to).
const loadHook = async () => {
  vi.resetModules();
  const { emptySplitApi } = await import("@/shared/store/emptyApi");
  const { useCreateDeck } = await import("./useCreateDeck");

  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

  return {
    render: () => renderHook(() => useCreateDeck(), { wrapper }).result,
  };
};

describe("useCreateDeck de-duplication", () => {
  it("collapses a rapid burst across both hook instances into one deck", async () => {
    const { render } = await loadHook();
    const headerBtn = render();
    const gridTile = render();

    act(() => {
      headerBtn.current.createDeckAndGoToEditor();
      gridTile.current.createDeckAndGoToEditor();
      headerBtn.current.createDeckAndGoToEditor();
    });

    await waitFor(() => expect(putIds.length).toBeGreaterThan(0));
    await waitFor(() => expect(headerBtn.current.isCreating).toBe(false));

    expect(putIds).toHaveLength(1);
    expect(navigateSpy).toHaveBeenCalledTimes(1);
    expect(navigateSpy).toHaveBeenCalledWith({
      to: `/decks/${putIds[0]}/edit`,
    });
  });

  it("returns the in-flight result to a second caller instead of minting a new id", async () => {
    const { render } = await loadHook();
    const headerBtn = render();
    const gridTile = render();

    const first = headerBtn.current.createDeck();
    const second = gridTile.current.createDeck();

    expect(second.id).toBe(first.id);
    expect(second.persisted).toBe(first.persisted);

    await act(async () => {
      await first.persisted;
    });
    expect(putIds).toEqual([first.id]);
  });

  it("shares the busy flag across instances so both controls disable", async () => {
    const { render } = await loadHook();
    const headerBtn = render();
    const gridTile = render();

    let releasePut!: () => void;
    const held = new Promise<void>((resolve) => {
      releasePut = resolve;
    });
    server.use(
      http.put(`${apiBaseUrl}/api/decks/:id`, async ({ params }) => {
        const id = String(params.id);
        putIds.push(id);
        await held;
        return HttpResponse.json(deckResponse(id));
      }),
    );

    act(() => {
      headerBtn.current.createDeckAndGoToEditor();
    });

    await waitFor(() => {
      expect(headerBtn.current.isCreating).toBe(true);
      expect(gridTile.current.isCreating).toBe(true);
    });

    await act(async () => {
      releasePut();
      await held;
    });

    await waitFor(() => {
      expect(headerBtn.current.isCreating).toBe(false);
      expect(gridTile.current.isCreating).toBe(false);
    });
  });

  it("clears the in-flight create when the PUT fails so a retry mints a fresh id", async () => {
    const { render } = await loadHook();
    const headerBtn = render();

    failNextPut = true;
    const failed = headerBtn.current.createDeck();
    await act(async () => {
      await expect(failed.persisted).rejects.toBeDefined();
    });
    await waitFor(() => expect(headerBtn.current.isCreating).toBe(false));

    const retried = headerBtn.current.createDeck();
    await act(async () => {
      await retried.persisted;
    });

    expect(retried.id).not.toBe(failed.id);
    expect(putIds).toEqual([failed.id, retried.id]);
  });
});
