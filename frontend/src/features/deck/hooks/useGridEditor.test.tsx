// Pins the Grid editor's structural invariants (deck-editor doctrine, mirrors
// useAxisEditor.test): the `correctCells` answer key is keyed only by ids of
// live items and only by cells that exist — removing an item drops its entry,
// removing a row/column drops entries in that lane and REINDEXES the lanes
// behind it — and `addItemToCell` seeds the new item's target in the same
// write. Also pins the GRID default-content shape `buildDefaultContent` mints.
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
  type GridContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { useGridEditor } from "./useGridEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-grid";

const gridContent: GridContent = {
  contentType: "GRID",
  rowLabels: ["Forest", "Ocean"],
  colLabels: ["Small", "Medium", "Large"],
  items: [
    { id: "it_a", label: "Fox" },
    { id: "it_b", label: "Deer" },
    { id: "it_c", label: "Whale" },
    { id: "it_d", label: "Crab" },
  ],
  correctCells: { it_a: "0,0", it_b: "0,1", it_c: "1,2" },
  scoreMode: "EXACT",
};

const gridSlide: SlideResponse = {
  id: SLIDE_ID,
  title: "Sort the animals",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content: gridContent,
};

// Capture each outgoing PUT body and echo the slide back so the mutation resolves.
let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([gridSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...gridSlide, ...lastPutBody });
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

const renderUseGridEditor = async () => {
  const store = makeStore();
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(
    deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [gridSlide]),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useGridEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const gridContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "GRID" ? body.content : undefined;

describe("buildDefaultContent(GRID)", () => {
  it("mints a 2×2 matrix with two seeded, unplaced items and EXACT fixed", () => {
    const content = buildDefaultContent("GRID");
    if (content.contentType !== "GRID") throw new Error("expected GRID content");

    expect(content.rowLabels).toEqual(["", ""]);
    expect(content.colLabels).toEqual(["", ""]);
    expect(content.items).toHaveLength(2);
    // Fresh client-minted ids so targets can be keyed immediately.
    expect(content.items[0].id).toBeTruthy();
    expect(content.items[0].id).not.toBe(content.items[1].id);
    expect(content.correctCells).toEqual({});
    expect(content.scoreMode).toBe("EXACT");
  });
});

describe("useGridEditor structural ops", () => {
  it("addItemToCell appends a fresh item already targeted at the cell", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.addItemToCell("1,0");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = gridContentOf(lastPutBody);
    expect(content?.items).toHaveLength(5);
    const added = content?.items[4];
    expect(added?.id).toBeTruthy();
    expect(added?.label).toBe("");
    expect(content?.correctCells).toEqual({ ...gridContent.correctCells, [added?.id ?? ""]: "1,0" });
  });

  it("removing an item drops its correctCells entry (key-consistency invariant)", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.removeItem("it_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = gridContentOf(lastPutBody);
    expect(content?.items.map((item) => item.id)).toEqual(["it_b", "it_c", "it_d"]);
    expect(content?.correctCells).toEqual({ it_b: "0,1", it_c: "1,2" });
  });

  it("removing a column drops targets in it and reindexes the columns behind it", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.removeLabel("col", 1);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = gridContentOf(lastPutBody);
    expect(content?.colLabels).toEqual(["Small", "Large"]);
    // it_b sat in the removed column → unplaced; it_c shifts from col 2 to 1.
    expect(content?.correctCells).toEqual({ it_a: "0,0", it_c: "1,1" });
  });

  it("removing a row drops targets in it and reindexes the rows behind it", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.removeLabel("row", 0);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = gridContentOf(lastPutBody);
    expect(content?.rowLabels).toEqual(["Ocean"]);
    // it_a and it_b sat in the removed row → unplaced; it_c shifts to row 0.
    expect(content?.correctCells).toEqual({ it_c: "0,2" });
  });

  it("setTargetCell assigns a cell and null clears it", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.setTargetCell("it_d", "1,1");
    });
    await vi.waitFor(() =>
      expect(gridContentOf(lastPutBody)?.correctCells["it_d"]).toBe("1,1"),
    );

    act(() => {
      result.current.setTargetCell("it_b", null);
    });
    await vi.waitFor(() =>
      expect(gridContentOf(lastPutBody)?.correctCells["it_b"]).toBeUndefined(),
    );
  });

  it("setItemColor and setItemImage patch only the addressed item, never the key", async () => {
    const result = await renderUseGridEditor();

    act(() => {
      result.current.setItemColor("it_a", "#ff8800");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let content = gridContentOf(lastPutBody);
    expect(content?.items.find((item) => item.id === "it_a")?.color).toBe("#ff8800");
    expect(content?.items.find((item) => item.id === "it_b")?.color).toBeUndefined();

    const image = { external: true, externalSrc: "https://example.test/whale.png" };
    act(() => {
      result.current.setItemImage("it_c", image);
    });
    await vi.waitFor(() =>
      expect(gridContentOf(lastPutBody)?.items.find((item) => item.id === "it_c")?.image).toEqual(
        image,
      ),
    );
    content = gridContentOf(lastPutBody);
    expect(content?.items.find((item) => item.id === "it_a")?.image).toBeUndefined();
    // Menu edits never disturb the answer key.
    expect(content?.correctCells).toEqual(gridContent.correctCells);
  });
});
