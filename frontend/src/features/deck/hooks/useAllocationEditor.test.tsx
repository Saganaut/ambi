// Pins the Allocation editor's structural invariants: the
// `correctAllocations` answer key is keyed only by ids of live options —
// removing an option must drop its answer — and answer/tolerance writes stay
// inside [0, pool]. Also pins the ALLOCATION default-content shape
// `buildDefaultContent` mints for a brand-new slide (two seeded options,
// collect-only).

//TODO: THIS WILL NEED TO BE UPDATE TO MATCH THE REFACTOR ON USE ALLOCATION EDITOR
import { configureStore } from "@reduxjs/toolkit";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";
import { act } from "react";
import { Provider } from "react-redux";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { apiBaseUrl, emptySplitApi } from "@/shared/store/emptyApi";
import {
  deckApi,
  type AllocationContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { useAllocationEditor } from "./useAllocationEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-allocation";

const allocationContent: AllocationContent = {
  contentType: "ALLOCATION",
  options: [
    { id: "opt_a", optionType: "TEXT", text: "Lembas" },
    { id: "opt_b", optionType: "TEXT", text: "Rope" },
    { id: "opt_c", optionType: "TEXT", text: "Mithril" },
  ],
  correctAllocations: {
    opt_a: 50,
    opt_b: 30,
  },
  totalPointsToAllocate: 100,
  tolerancePerOption: 5,
};

const allocationSlide: SlideResponse = {
  id: SLIDE_ID,
  title: "Pack for the journey",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content: allocationContent,
};

// Capture each outgoing PUT body and echo the slide back so the mutation resolves.
let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([allocationSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...allocationSlide, ...lastPutBody });
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

const renderUseAllocationEditor = async () => {
  const store = makeStore();
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(
    deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [allocationSlide]),
  );
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useAllocationEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const allocationContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "ALLOCATION" ? body.content : undefined;

describe("buildDefaultContent(ALLOCATION)", () => {
  it("mints a collect-only 100-point pool with two seeded options", () => {
    const content = buildDefaultContent("ALLOCATION");
    if (content.contentType !== "ALLOCATION") throw new Error("expected ALLOCATION content");

    expect(content.options).toHaveLength(2);
    // Fresh client-minted ids so answers can be keyed immediately.
    expect(content.options[0].id).toBeTruthy();
    expect(content.options[0].id).not.toBe(content.options[1].id);
    expect(content.options[0].text).toBe("");
    // Unscored until the author sets answers (collect-only is legitimate).
    expect(content.correctAllocations).toBeUndefined();
    expect(content.totalPointsToAllocate).toBe(100);
    expect(content.tolerancePerOption).toBe(0);
  });
});

describe("useAllocationEditor structural ops", () => {
  it("scheduleOptionText persists the edited option text without changing sibling options", async () => {
    const result = await renderUseAllocationEditor();

    act(() => {
      result.current.scheduleOptionText("opt_a", "Water");
      result.current.flush();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = allocationContentOf(lastPutBody);
    expect(content?.options.find((option) => option.id === "opt_a")?.text).toBe("Water");
    expect(content?.options.find((option) => option.id === "opt_b")?.text).toBe("Rope");
  });

  it("reorders options without changing their id-keyed answers", () => {
    const reordered = reorderAllocationOptions(allocationContent.options, 0, 2);

    expect(reordered.map((option) => option.id)).toEqual(["opt_b", "opt_c", "opt_a"]);
    expect(allocationContent.correctAllocations).toEqual({ opt_a: 50, opt_b: 30 });
  });

  it("removing an option drops its correctAllocations entry (key-consistency invariant)", async () => {
    const result = await renderUseAllocationEditor();

    act(() => {
      result.current.removeOption("opt_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = allocationContentOf(lastPutBody);
    expect(content?.options.map((option) => option.id)).toEqual(["opt_b", "opt_c"]);
    expect(content?.correctAllocations).toEqual({ opt_b: 30 });
  });

  it("commitCorrectAllocation writes a clamped whole-point answer and clear drops it", async () => {
    const result = await renderUseAllocationEditor();

    act(() => {
      result.current.commitCorrectAllocation("opt_c", 140.4);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    expect(allocationContentOf(lastPutBody)?.correctAllocations?.["opt_c"]).toBe(100);

    act(() => {
      result.current.commitCorrectAllocation("opt_c", -3);
    });
    await vi.waitFor(() =>
      expect(allocationContentOf(lastPutBody)?.correctAllocations?.["opt_c"]).toBe(0),
    );

    act(() => {
      result.current.clearCorrectAllocation("opt_b");
    });
    await vi.waitFor(() =>
      expect(allocationContentOf(lastPutBody)?.correctAllocations?.["opt_b"]).toBeUndefined(),
    );
    // Clearing one option leaves the others' answers intact.
    expect(allocationContentOf(lastPutBody)?.correctAllocations?.["opt_a"]).toBe(50);
  });

  it("addOption appends a fresh blank option without touching existing answers", async () => {
    const result = await renderUseAllocationEditor();

    act(() => {
      result.current.addOption();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = allocationContentOf(lastPutBody);
    expect(content?.options).toHaveLength(4);
    expect(content?.options[3].id).toBeTruthy();
    expect(content?.options[3].text).toBe("");
    expect(content?.correctAllocations).toEqual(allocationContent.correctAllocations);
  });

  it("setOptionColor and setOptionImage patch only the addressed option", async () => {
    const result = await renderUseAllocationEditor();

    act(() => {
      result.current.setOptionColor("opt_a", "#ff8800");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let content = allocationContentOf(lastPutBody);
    expect(content?.options.find((option) => option.id === "opt_a")?.color).toBe("#ff8800");
    expect(content?.options.find((option) => option.id === "opt_b")?.color).toBeUndefined();

    const image = { external: true, externalSrc: "https://example.test/rope.png" };
    act(() => {
      result.current.setOptionImage("opt_b", image);
    });
    await vi.waitFor(() =>
      expect(
        allocationContentOf(lastPutBody)?.options.find((option) => option.id === "opt_b")?.image,
      ).toEqual(image),
    );
    content = allocationContentOf(lastPutBody);
    expect(content?.options.find((option) => option.id === "opt_a")?.image).toBeUndefined();
    // Structural menu edits never disturb the answer key.
    expect(content?.correctAllocations).toEqual(allocationContent.correctAllocations);
  });

  it("scheduleTotalPoints floors at the 1-point minimum and scheduleTolerance clamps to the pool", async () => {
    const result = await renderUseAllocationEditor();

    // Both edits land in one debounce window: the tolerance clamp must derive
    // from the pending pool size in the same draft, not the stale cache value.
    act(() => {
      result.current.scheduleTotalPoints(-20);
      result.current.scheduleTolerance(500);
      result.current.flush();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = allocationContentOf(lastPutBody);
    expect(content?.totalPointsToAllocate).toBe(1);
    expect(content?.tolerancePerOption).toBe(1);
  });
});
