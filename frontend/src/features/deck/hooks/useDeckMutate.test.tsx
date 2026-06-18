// Pins the updateDeck merge rule: PATCH /api/decks/{id} is a full-replace, so a
// partial edit (rename, publish, theme) must be merged over the deck's current
// cached metadata before it goes out — otherwise renaming a deck would null its
// publishStatus, theme, description, etc. (see useDeckMutate).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import {
  deckApi,
  type DeckResponse,
  type UpdateDeckRequest,
} from "../store/deckApi.gen";
import { useDeckMutate } from "./useDeckMutate";

const DECK_ID = "deck-1";

// A fully-populated deck so we can assert every owned metadata field survives a
// single-field edit.
const cachedDeck: DeckResponse = {
  id: DECK_ID,
  publicId: "pub-1",
  name: "Fellowship Quiz",
  label: "lotr",
  description: "A quiz about the Fellowship",
  themeId: "theme-9",
  version: 3,
  publishStatus: "PUBLISHED",
  visibility: "PRIVATE",
  language: "en",
  creatorUserId: "u1",
  originalAuthorUserId: "u1",
  tags: ["lotr"],
  ownership: { kind: "USER", userId: "u1" } as DeckResponse["ownership"],
  acl: [],
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-02T00:00:00Z",
  permissions: {} as DeckResponse["permissions"],
};

// Capture each outgoing PATCH body and echo a deck back so the mutation resolves.
let lastPatchBody: UpdateDeckRequest | undefined;
const server = setupServer(
  http.patch(`${apiBaseUrl}/api/decks/${DECK_ID}`, async ({ request }) => {
    lastPatchBody = (await request.json()) as UpdateDeckRequest;
    return HttpResponse.json({ ...cachedDeck, ...lastPatchBody });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  lastPatchBody = undefined;
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

const renderUseDeckMutate = (store: ReturnType<typeof makeStore>) => {
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useDeckMutate(DECK_ID), { wrapper }).result;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("useDeckMutate.updateDeck merge", () => {
  it("merges a partial patch over the cached metadata instead of nulling it", async () => {
    const store = makeStore();
    // Prime the getDeck cache the editor would have populated.
    await store.dispatch(
      deckApi.util.upsertQueryData("getDeck", { id: DECK_ID }, cachedDeck),
    );

    const result = renderUseDeckMutate(store);
    result.current.updateDeck({ publishStatus: "DRAFT" });
    await vi.waitFor(() => expect(lastPatchBody).toBeDefined());

    // Only publishStatus changes; every other owned field is carried through.
    expect(lastPatchBody).toEqual({
      name: "Fellowship Quiz",
      label: "lotr",
      description: "A quiz about the Fellowship",
      themeId: "theme-9",
      language: "en",
      publishStatus: "DRAFT",
    });
  });

  it("rename preserves publishStatus and the rest of the metadata", async () => {
    const store = makeStore();
    await store.dispatch(
      deckApi.util.upsertQueryData("getDeck", { id: DECK_ID }, cachedDeck),
    );

    const result = renderUseDeckMutate(store);
    result.current.rename("Renamed Quiz");
    await vi.waitFor(() => expect(lastPatchBody).toBeDefined());

    expect(lastPatchBody?.name).toBe("Renamed Quiz");
    expect(lastPatchBody?.publishStatus).toBe("PUBLISHED");
    expect(lastPatchBody?.themeId).toBe("theme-9");
    expect(lastPatchBody?.description).toBe("A quiz about the Fellowship");
  });

  it("does not send a clobbering partial when the deck is not cached", async () => {
    const store = makeStore();
    const result = renderUseDeckMutate(store);

    result.current.updateDeck({ publishStatus: "DRAFT" });
    await flush();

    expect(lastPatchBody).toBeUndefined();
  });
});
