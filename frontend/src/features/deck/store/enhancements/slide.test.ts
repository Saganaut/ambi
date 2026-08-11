// Pins the duplicateSlide cache rule: the copies' ids are minted server-side, so
// the mutation carries no optimistic patch — the cached `listDeckSlides` array
// stays as-is until the response lands and is then replaced wholesale by the
// canonical order the server returns (source, its follow-up, then both copies).
// A failed duplicate must leave that cache untouched.
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import { deckApi, type SlideResponse } from "../deckApi.gen";
import "./slide";

const DECK_ID = "deck-1";

const slide = (overrides: Partial<SlideResponse> & { id: string }): SlideResponse => ({
  title: "Capital cities",
  content: {
    contentType: "MCQ",
    options: [],
    correctOptionIds: [],
    dataVisualization: "BAR_VERTICAL",
  },
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  ...overrides,
});

const followUp = (
  overrides: Partial<SlideResponse> & { id: string },
): SlideResponse => ({
  title: "",
  content: { contentType: "FOLLOW_UP", mode: "PREDICT_POPULAR" },
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  ...overrides,
});

// Source unit (a parent with an attached follow-up) plus an unrelated trailing
// slide, so the reconcile has to preserve order rather than just append.
const cachedSlides: SlideResponse[] = [
  slide({ id: "source", childId: "source-fu", sortOrder: "a" }),
  followUp({ id: "source-fu", parentId: "source", sortOrder: "b" }),
  slide({ id: "trailing", title: "Wrap up", sortOrder: "c" }),
];

// What the server answers with: both copies slotted directly after the source
// unit, linked to each other, and the trailing slide pushed along.
const duplicatedSlides: SlideResponse[] = [
  slide({ id: "source", childId: "source-fu", sortOrder: "a" }),
  followUp({ id: "source-fu", parentId: "source", sortOrder: "b" }),
  slide({ id: "copy", childId: "copy-fu", sortOrder: "ba" }),
  followUp({ id: "copy-fu", parentId: "copy", sortOrder: "bb" }),
  slide({ id: "trailing", title: "Wrap up", sortOrder: "c" }),
];

const duplicateUrl = `${apiBaseUrl}/api/decks/${DECK_ID}/slides/:slideId/duplicate`;

const server = setupServer(
  http.post(duplicateUrl, () =>
    HttpResponse.json(duplicatedSlides, { status: 201 }),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
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

const primeSlides = async (store: ReturnType<typeof makeStore>) => {
  await store.dispatch(
    deckApi.util.upsertQueryData(
      "listDeckSlides",
      { id: DECK_ID },
      cachedSlides,
    ),
  );
};

const cachedList = (store: ReturnType<typeof makeStore>) =>
  deckApi.endpoints.listDeckSlides.select({ id: DECK_ID })(store.getState())
    .data;

describe("duplicateSlide cache sync", () => {
  it("replaces the cached slide list with the order the response carries", async () => {
    const store = makeStore();
    await primeSlides(store);

    await store.dispatch(
      deckApi.endpoints.duplicateSlide.initiate({
        id: DECK_ID,
        slideId: "source",
      }),
    );
    // The onQueryStarted continuation lands after the dispatch promise
    // resolves — flush a macrotask so the reconcile has been dispatched.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(cachedList(store)).toEqual(duplicatedSlides);
  });

  it("leaves the cached slide list untouched when the duplicate is rejected", async () => {
    server.use(
      http.post(duplicateUrl, () =>
        HttpResponse.json({ message: "nope" }, { status: 400 }),
      ),
    );
    const store = makeStore();
    await primeSlides(store);

    const result = await store.dispatch(
      deckApi.endpoints.duplicateSlide.initiate({
        id: DECK_ID,
        slideId: "source-fu",
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(result.error).toBeDefined();
    expect(cachedList(store)).toEqual(cachedSlides);
  });
});
