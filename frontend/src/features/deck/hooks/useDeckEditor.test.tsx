// Pins the duplicate-slide intent of the deck-editor view-model: the copies' ids
// are minted server-side, so `duplicateSlide` can only move the selection once
// the response lands — and it must land on the copy itself, never on the cloned
// follow-up that rides along with it. A rejected duplicate leaves the selection
// where it was.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook, act, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { DeckResponse, SlideResponse } from "@deck/store/deckApi.gen";
import "@deck/store/enhancements/slide";
import { useDeckEditor } from "./useDeckEditor";

// The view-model owns navigation (it writes the selected slide into the route's
// search params); stub the router so we can read back what it selected.
const { navigateSpy } = vi.hoisted(() => ({ navigateSpy: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({
  getRouteApi: () => ({ useNavigate: () => navigateSpy }),
  useNavigate: () => navigateSpy,
}));

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

const existingSlides: SlideResponse[] = [
  slide({ id: "source", childId: "source-fu" }),
  followUp({ id: "source-fu", parentId: "source" }),
];

// The canonical order the server answers with: the copy and its cloned follow-up
// slotted straight after the source unit. Two ids the editor has never seen come
// back at once, and only one of them is the slide to select.
const afterDuplicate: SlideResponse[] = [
  slide({ id: "source", childId: "source-fu" }),
  followUp({ id: "source-fu", parentId: "source" }),
  slide({ id: "copy", childId: "copy-fu" }),
  followUp({ id: "copy-fu", parentId: "copy" }),
];

const deck = {
  id: DECK_ID,
  name: "Fellowship Quiz",
  permissions: { canEdit: true },
} as DeckResponse;

const duplicateUrl = `${apiBaseUrl}/api/decks/${DECK_ID}/slides/:slideId/duplicate`;

const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}`, () => HttpResponse.json(deck)),
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () =>
    HttpResponse.json(existingSlides),
  ),
  http.post(duplicateUrl, () =>
    HttpResponse.json(afterDuplicate, { status: 201 }),
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

const renderUseDeckEditor = () => {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useDeckEditor(DECK_ID, "source"), { wrapper }).result;
};

/** The slideId the last navigate call would write into the route's search. */
const lastSelectedSlideId = () => {
  const [options] = navigateSpy.mock.calls.at(-1) as [
    { search: (prev: Record<string, unknown>) => { slideId?: string } },
  ];
  return options.search({}).slideId;
};

describe("useDeckEditor.duplicateSlide", () => {
  it("selects the copy the response introduced, not its cloned follow-up", async () => {
    const result = renderUseDeckEditor();
    await waitFor(() => {
      expect(result.current.slides).toHaveLength(2);
    });

    act(() => {
      result.current.duplicateSlide("source");
    });

    await waitFor(() => {
      expect(navigateSpy).toHaveBeenCalled();
    });
    expect(lastSelectedSlideId()).toBe("copy");
  });

  it("keeps the selection where it was when the duplicate is rejected", async () => {
    server.use(
      http.post(duplicateUrl, () =>
        HttpResponse.json({ message: "nope" }, { status: 400 }),
      ),
    );
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    const result = renderUseDeckEditor();
    await waitFor(() => {
      expect(result.current.slides).toHaveLength(2);
    });

    act(() => {
      result.current.duplicateSlide("source");
    });

    await waitFor(() => {
      expect(errorSpy).toHaveBeenCalled();
    });
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(result.current.slides).toEqual(existingSlides);
    errorSpy.mockRestore();
  });
});
