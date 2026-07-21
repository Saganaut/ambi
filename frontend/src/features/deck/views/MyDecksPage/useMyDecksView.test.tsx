// Pins the My Decks view-model filtering rules: search matches across
// name/description/tags (case-insensitive), the status tabs partition by
// publishStatus, counts follow the current search, and lastEditedAt is the
// most recent updatedAt across all owned decks.
import {
  describe,
  it,
  expect,
  beforeAll,
  afterAll,
  afterEach,
} from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { act, renderHook, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { DeckResponse } from "../../store/deckApi.gen";
import { useMyDecksView } from "./useMyDecksView";

const baseDeck: Omit<
  DeckResponse,
  "id" | "publicId" | "name" | "publishStatus" | "updatedAt"
> = {
  version: 1,
  visibility: "PRIVATE",
  language: "en",
  creatorUserId: "u1",
  originalAuthorUserId: "u1",
  tags: [],
  ownership: { kind: "USER", userId: "u1" } as DeckResponse["ownership"],
  acl: [],
  createdAt: "2026-01-01T00:00:00Z",
  permissions: {} as DeckResponse["permissions"],
};

const decks: DeckResponse[] = [
  {
    ...baseDeck,
    id: "d1",
    publicId: "p1",
    name: "Fellowship Quiz",
    publishStatus: "PUBLISHED",
    updatedAt: "2026-01-03T00:00:00Z",
    tags: ["lotr"],
  },
  {
    ...baseDeck,
    id: "d2",
    publicId: "p2",
    name: "Untitled Deck",
    description: "Battles of the Third Age",
    publishStatus: "DRAFT",
    updatedAt: "2026-01-05T00:00:00Z",
  },
  {
    ...baseDeck,
    id: "d3",
    publicId: "p3",
    name: "Old Deck",
    publishStatus: "ARCHIVED",
    updatedAt: "2026-01-02T00:00:00Z",
  },
];

let listResponse: DeckResponse[] = decks;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/mine`, () =>
    HttpResponse.json(listResponse),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  listResponse = decks;
});
afterAll(() => {
  server.close();
});

const renderView = () => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useMyDecksView(), { wrapper });
};

const renderLoadedView = async () => {
  const view = renderView();
  await waitFor(() => {
    expect(view.result.current.isLoading).toBe(false);
    expect(view.result.current.deckCount).toBe(listResponse.length);
  });
  return view;
};

describe("useMyDecksView", () => {
  it("partitions decks by publish status and counts them", async () => {
    const { result } = await renderLoadedView();

    expect(result.current.decksByFilter.all.map((d) => d.id)).toEqual([
      "d1",
      "d2",
      "d3",
    ]);
    expect(result.current.decksByFilter.published.map((d) => d.id)).toEqual([
      "d1",
    ]);
    expect(result.current.decksByFilter.drafts.map((d) => d.id)).toEqual([
      "d2",
    ]);
    expect(result.current.decksByFilter.archived.map((d) => d.id)).toEqual([
      "d3",
    ]);
    expect(result.current.countsByFilter).toEqual({
      all: 3,
      published: 1,
      drafts: 1,
      archived: 1,
    });
  });

  it("matches search against name, description, and tags, ignoring case", async () => {
    const { result } = await renderLoadedView();

    act(() => {
      result.current.setSearch("  FELLOWSHIP ");
    });
    expect(result.current.decksByFilter.all.map((d) => d.id)).toEqual(["d1"]);

    act(() => {
      result.current.setSearch("third age");
    });
    expect(result.current.decksByFilter.all.map((d) => d.id)).toEqual(["d2"]);

    act(() => {
      result.current.setSearch("lotr");
    });
    expect(result.current.decksByFilter.all.map((d) => d.id)).toEqual(["d1"]);
  });

  it("keeps counts in sync with the search, but deckCount unfiltered", async () => {
    const { result } = await renderLoadedView();

    act(() => {
      result.current.setSearch("no-such-deck");
    });
    expect(result.current.countsByFilter).toEqual({
      all: 0,
      published: 0,
      drafts: 0,
      archived: 0,
    });
    expect(result.current.deckCount).toBe(3);
  });

  it("reports the most recent updatedAt as lastEditedAt", async () => {
    const { result } = await renderLoadedView();
    expect(result.current.lastEditedAt).toBe("2026-01-05T00:00:00Z");
  });

  it("reports no lastEditedAt when the user owns no decks", async () => {
    listResponse = [];
    const { result } = await renderLoadedView();
    expect(result.current.deckCount).toBe(0);
    expect(result.current.lastEditedAt).toBeUndefined();
  });
});
