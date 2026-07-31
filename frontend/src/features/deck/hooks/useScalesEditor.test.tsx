// Pins the Scales editor's continuous-scale invariants (spec: scales-slides):
// the `correctValues` answer key is keyed only by ids of live statements
// (removing a statement drops its target), and `tolerance` stays within the
// fraction bounds of the span — clamped when the author sets it and re-clamped
// whenever an endpoint moves the span.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import {
  deckApi,
  type ScalesContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { useScalesEditor } from "./useScalesEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-scales";

const scalesContent: ScalesContent = {
  contentType: "SCALES",
  min: 1,
  max: 5,
  leftLabel: "Disagree",
  rightLabel: "Agree",
  items: [
    { id: "st_a", label: "First", color: "#ff0000" },
    { id: "st_b", label: "Second", color: "#00ff00" },
  ],
  correctValues: {
    st_a: 4,
    st_b: 2,
  },
  // 1 of a 4-wide span = 25 %, inside the 2–50 % bounds.
  tolerance: 1,
};

const scalesSlide: SlideResponse = {
  id: SLIDE_ID,
  title: "Rate these",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content: scalesContent,
};

let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([scalesSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...scalesSlide, ...lastPutBody });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  lastPutBody = undefined;
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

const renderUseScalesEditor = async () => {
  const store = makeStore();
  await store.dispatch(
    deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [scalesSlide]),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useScalesEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const scalesContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "SCALES" ? body.content : undefined;

describe("useScalesEditor structural ops", () => {
  it("removing a statement drops its correctValues entry (key-consistency invariant)", async () => {
    const result = await renderUseScalesEditor();

    act(() => {
      result.current.removeStatement("st_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = scalesContentOf(lastPutBody);
    expect(content?.items.map((item) => item.id)).toEqual(["st_b"]);
    expect(content?.correctValues).toEqual({ st_b: 2 });
  });
});

describe("useScalesEditor tolerance clamping", () => {
  it("setTolerance clamps to the fraction bounds of the span", async () => {
    const result = await renderUseScalesEditor();

    // 50 % of the 4-wide span is the max (2.0); 5.0 overshoots.
    act(() => {
      result.current.setTolerance(5);
    });
    await vi.waitFor(() => expect(scalesContentOf(lastPutBody)?.tolerance).toBe(2));

    // 2 % of the span is the floor (0.08); 0.01 undershoots.
    act(() => {
      result.current.setTolerance(0.01);
    });
    await vi.waitFor(() => expect(scalesContentOf(lastPutBody)?.tolerance).toBeCloseTo(0.08));
  });

  it("re-clamps the stored tolerance when an endpoint shrinks the span", async () => {
    const result = await renderUseScalesEditor();

    // Shrink the span to max−min = 5−4 = 1; the stored tolerance 1 now exceeds
    // 50 % of the span (0.5), so it must be re-clamped down in the same commit.
    act(() => {
      result.current.scheduleMin(4);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = scalesContentOf(lastPutBody);
    expect(content?.min).toBe(4);
    expect(content?.tolerance).toBe(0.5);
  });
});
