// Pins the Axis editor's structural invariant (spec: axis-slides): the
// `correctPositions` answer key is keyed only by ids of live items — removing
// an item must drop its target — target writes stay inside the normalized
// [0, 1] plane, and a new item is minted with the lowest palette color its
// siblings have not claimed (a stored fact, so reordering the bank can never
// repaint it). Also pins the AXIS default-content shape `buildDefaultContent`
// mints for a brand-new slide (collect-only, INSIDE_RADIUS fixed).
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { act } from "react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import {
  deckApi,
  type AxisContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { useAxisEditor } from "./useAxisEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-axis";

const axisContent: AxisContent = {
  contentType: "AXIS",
  xLowLabel: "Cautious",
  xHighLabel: "Reckless",
  yLowLabel: "Humble",
  yHighLabel: "Proud",
  // Migrated content: every item carries its id and its own color, so the
  // load-time identity backfill has nothing to repair and writes nothing.
  items: [
    { id: "item_a", label: "Samwise", color: paletteColorAt(0) },
    { id: "item_b", label: "Pippin", color: paletteColorAt(1) },
  ],
  correctPositions: {
    item_a: { x: 0.2, y: 0.15 },
    item_b: { x: 0.85, y: 0.3 },
  },
  tolerance: 0.1,
  scoreMode: "INSIDE_RADIUS",
};

const axisSlide: SlideResponse = {
  id: SLIDE_ID,
  title: "Fellowship Temperaments",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content: axisContent,
};

// Capture each outgoing PUT body and echo the slide back so the mutation resolves.
let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([axisSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...axisSlide, ...lastPutBody });
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

const renderUseAxisEditor = async () => {
  const store = makeStore();
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(
    deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [axisSlide]),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useAxisEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const axisContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "AXIS" ? body.content : undefined;

describe("buildDefaultContent(AXIS)", () => {
  it("mints a collect-only plane with two seeded items and INSIDE_RADIUS fixed", () => {
    const content = buildDefaultContent("AXIS");
    if (content.contentType !== "AXIS") throw new Error("expected AXIS content");

    expect(content.xLowLabel).toBe("");
    expect(content.xHighLabel).toBe("");
    expect(content.yLowLabel).toBe("");
    expect(content.yHighLabel).toBe("");
    expect(content.items).toHaveLength(2);
    // Fresh client-minted ids so targets can be keyed immediately.
    expect(content.items[0].id).toBeTruthy();
    expect(content.items[0].id).not.toBe(content.items[1].id);
    // Unscored until the author places targets (collect-only is legitimate).
    expect(content.correctPositions).toEqual({});
    expect(content.tolerance).toBe(0.1);
    expect(content.scoreMode).toBe("INSIDE_RADIUS");
  });
});

describe("useAxisEditor structural ops", () => {
  it("removing an item drops its correctPositions entry (key-consistency invariant)", async () => {
    const result = await renderUseAxisEditor();

    act(() => {
      result.current.actions.removeItem("item_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = axisContentOf(lastPutBody);
    expect(content?.items.map((item) => item.id)).toEqual(["item_b"]);
    expect(content?.correctPositions).toEqual({ item_b: { x: 0.85, y: 0.3 } });
  });

  it("commitCorrectAnswer writes a clamped normalized point and clearCorrectAnswer drops it", async () => {
    const result = await renderUseAxisEditor();

    act(() => {
      result.current.actions.commitCorrectAnswer("item_a", { x: 1.4, y: -0.2 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    expect(axisContentOf(lastPutBody)?.correctPositions["item_a"]).toEqual({ x: 1, y: 0 });

    act(() => {
      result.current.actions.clearCorrectAnswer("item_b");
    });
    await vi.waitFor(() =>
      expect(axisContentOf(lastPutBody)?.correctPositions["item_b"]).toBeUndefined(),
    );
  });

  it("addItem appends a fresh item, colored from the lowest free palette slot", async () => {
    const result = await renderUseAxisEditor();

    act(() => {
      result.current.actions.addItem();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = axisContentOf(lastPutBody);
    expect(content?.items).toHaveLength(3);
    expect(content?.items[2].id).toBeTruthy();
    expect(content?.items[2].label).toBe("");
    // Slots 0 and 1 are taken by the two existing items.
    expect(content?.items[2].color).toBe(paletteColorAt(2));
    expect(content?.correctPositions).toEqual(axisContent.correctPositions);
  });

  it("setItemColor and setItemImage patch only the addressed item", async () => {
    const result = await renderUseAxisEditor();

    act(() => {
      result.current.actions.setItemColor("item_a", "#ff8800");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let content = axisContentOf(lastPutBody);
    expect(content?.items.find((item) => item.id === "item_a")?.color).toBe("#ff8800");
    // The sibling keeps its own stored color — an override touches one item.
    expect(content?.items.find((item) => item.id === "item_b")?.color).toBe(paletteColorAt(1));

    const image = { external: true, externalSrc: "https://example.test/pippin.png" };
    act(() => {
      result.current.actions.setItemImage("item_b", image);
    });
    await vi.waitFor(() =>
      expect(axisContentOf(lastPutBody)?.items.find((item) => item.id === "item_b")?.image).toEqual(
        image,
      ),
    );
    content = axisContentOf(lastPutBody);
    expect(content?.items.find((item) => item.id === "item_a")?.image).toBeUndefined();
    // Structural menu edits never disturb the answer key.
    expect(content?.correctPositions).toEqual(axisContent.correctPositions);
  });

  it("setTolerance clamps to the tolerance bounds", async () => {
    const result = await renderUseAxisEditor();

    act(() => {
      result.current.actions.setTolerance(0.9);
    });
    await vi.waitFor(() => expect(axisContentOf(lastPutBody)?.tolerance).toBe(0.5));

    act(() => {
      result.current.actions.setTolerance(0.001);
    });
    await vi.waitFor(() => expect(axisContentOf(lastPutBody)?.tolerance).toBe(0.02));
  });
});
