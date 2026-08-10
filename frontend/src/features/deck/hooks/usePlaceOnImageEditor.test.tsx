// Pins the Place-on-Image editor's invariants: an added item is minted with the
// lowest free palette color, and it is keyed with an answer-key entry in that
// same write only when the gesture carried a point — a bank add is UNPLACED, a
// target with no right answer. Target points stay inside the normalized [0, 1]
// image box, the one slide-level tolerance is a single field (never per-item
// geometry), removing an item takes its answer key with it, clearing a target
// leaves the item in the bank, and every item op is addressed by id alone —
// including a stale id that must do nothing, and a legacy item that reaches the
// editor without an id and is repaired by the load-time identity backfill before
// any op can address it. Also pins the PLACE_ON_IMAGE default-content shape
// `buildDefaultContent` mints for a brand-new slide (no items, unscored,
// INSIDE_RADIUS fixed).
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
  type PlaceOnImageContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { usePlaceOnImageEditor } from "./usePlaceOnImageEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-place";

// Migrated content: every item carries the id its target is keyed by and the
// color minted for it, so the load-time backfill has nothing to repair and
// writes nothing.
const placeContent: PlaceOnImageContent = {
  contentType: "PLACE_ON_IMAGE",
  image: { external: true, externalSrc: "https://example.test/middle-earth.png" },
  items: [
    { id: "target_a", color: paletteColorAt(0) },
    { id: "target_b", color: paletteColorAt(1) },
  ],
  correctPositions: {
    target_a: { x: 0.2, y: 0.15 },
    target_b: { x: 0.85, y: 0.3 },
  },
  tolerance: 0.08,
  scoreMode: "INSIDE_RADIUS",
};

// A deck whose first item reaches the editor without an id or a color (content
// authored before either was on the wire, or migrated from a target that had
// neither), so the editor has to repair it on load. Being id-less, it cannot
// carry an answer-key entry either — it is the unplaced case the view models.
const legacyContent: PlaceOnImageContent = {
  ...placeContent,
  items: [{ label: "Rivendell" }, { id: "target_b" }],
  correctPositions: { target_b: { x: 0.85, y: 0.3 } },
};

const slideWith = (content: PlaceOnImageContent): SlideResponse => ({
  id: SLIDE_ID,
  title: "Where is Rivendell?",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content,
});

const placeSlide = slideWith(placeContent);

// The slide the handlers serve — swapped per test by the render helper.
let activeSlide: SlideResponse = placeSlide;
// Capture each outgoing PUT body and echo the slide back so the mutation resolves.
let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([activeSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...activeSlide, ...lastPutBody });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  lastPutBody = undefined;
  activeSlide = placeSlide;
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

const renderUsePlaceOnImageEditor = async (slide: SlideResponse = placeSlide) => {
  activeSlide = slide;
  const store = makeStore();
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [slide]));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => usePlaceOnImageEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const placeContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "PLACE_ON_IMAGE" ? body.content : undefined;

describe("buildDefaultContent(PLACE_ON_IMAGE)", () => {
  it("mints an item-less pin drop with a blank image and INSIDE_RADIUS fixed", () => {
    const content = buildDefaultContent("PLACE_ON_IMAGE");
    if (content.contentType !== "PLACE_ON_IMAGE") {
      throw new Error("expected PLACE_ON_IMAGE content");
    }

    expect(content.image).toEqual({ external: true });
    // Nothing to place until the author picks an image, and unscored until the
    // items are placed (collect-only is legitimate).
    expect(content.items).toEqual([]);
    expect(content.correctPositions).toEqual({});
    expect(content.tolerance).toBe(0.1);
    expect(content.scoreMode).toBe("INSIDE_RADIUS");
  });
});

describe("usePlaceOnImageEditor target ops", () => {
  it("addItemAtPoint mints an item already placed at the clamped point", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.addItemAtPoint({ x: 1.4, y: -0.2 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = placeContentOf(lastPutBody);
    expect(content?.items).toHaveLength(3);
    const added = content?.items[2];
    expect(added?.id).toBeTruthy();
    expect(added?.id).not.toBe("target_a");
    // The color is stored at creation — the lowest palette slot the existing
    // items have not claimed — so a later reorder can never repaint it.
    expect(added).toMatchObject({ label: "", color: paletteColorAt(2) });
    // The item is born placed: the same updater keyed its target.
    expect(content?.correctPositions[added?.id ?? ""]).toEqual({ x: 1, y: 0 });
    // Existing items, their targets and the slide tolerance are untouched.
    expect(content?.items.slice(0, 2)).toEqual(placeContent.items);
    expect(content?.correctPositions.target_a).toEqual({ x: 0.2, y: 0.15 });
    expect(content?.tolerance).toBe(0.08);
  });

  it("addItem appends an UNPLACED item — no answer-key entry", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.addItem();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = placeContentOf(lastPutBody);
    expect(content?.items).toHaveLength(3);
    const added = content?.items[2];
    expect(added?.id).toBeTruthy();
    expect(added).toMatchObject({ label: "", color: paletteColorAt(2) });
    // The bank grew but the answer key did not: an unplaced target exists and
    // is numbered, it simply keys no right answer.
    expect(content?.correctPositions).toEqual(placeContent.correctPositions);
    expect(content?.correctPositions[added?.id ?? ""]).toBeUndefined();
  });

  it("commitCorrectAnswer writes a clamped normalized point to only the addressed key", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.commitCorrectAnswer("target_a", { x: -0.4, y: 1.2 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = placeContentOf(lastPutBody);
    expect(content?.correctPositions).toEqual({
      target_a: { x: 0, y: 1 },
      target_b: { x: 0.85, y: 0.3 },
    });
    // Moving a target is geometry only — the bank is untouched.
    expect(content?.items).toEqual(placeContent.items);
  });

  it("clearCorrectAnswer drops only that item's entry and leaves the item in the bank", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.clearCorrectAnswer("target_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = placeContentOf(lastPutBody);
    // Unplacing is not removing: the row survives, unkeyed and ungraded.
    expect(content?.items).toEqual(placeContent.items);
    expect(content?.correctPositions).toEqual({ target_b: { x: 0.85, y: 0.3 } });
  });

  it("clearCorrectAnswer with a stale id mints nothing and drops nothing", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.clearCorrectAnswer("target_gone");
      // A write that does land, so the assertions read a real request body.
      result.current.actions.setItemColor("target_a", "#ff8800");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = placeContentOf(lastPutBody);
    // The phantom id neither minted an entry nor took a live one with it.
    expect(content?.correctPositions).toEqual(placeContent.correctPositions);
    expect(content?.items.map((item) => item.id)).toEqual(["target_a", "target_b"]);
  });

  it("removeItem drops only the addressed item", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.removeItem("target_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    expect(placeContentOf(lastPutBody)?.items).toEqual([placeContent.items[1]]);
  });

  it("removeItem takes the item's answer-key entry with it", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.removeItem("target_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    // The key is dropped in the same write, so no entry outlives its item.
    expect(placeContentOf(lastPutBody)?.correctPositions).toEqual({
      target_b: { x: 0.85, y: 0.3 },
    });
  });

  it("label/color/image ops patch only the addressed item, never the answer key", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.scheduleItemLabel("target_a", "Rivendell");
      result.current.actions.flush();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let items = placeContentOf(lastPutBody)?.items;
    expect(items?.[0].label).toBe("Rivendell");
    expect(items?.[1].label).toBeUndefined();

    act(() => {
      result.current.actions.setItemColor("target_b", "#ff8800");
    });
    await vi.waitFor(() => expect(placeContentOf(lastPutBody)?.items[1].color).toBe("#ff8800"));

    const image = { external: true, externalSrc: "https://example.test/rivendell.png" };
    act(() => {
      result.current.actions.setItemImage("target_a", image);
    });
    await vi.waitFor(() => expect(placeContentOf(lastPutBody)?.items[0].image).toEqual(image));

    items = placeContentOf(lastPutBody)?.items;
    // The other item's own color is untouched by a sibling's override.
    expect(items?.[0].color).toBe(paletteColorAt(0));
    expect(items?.[1].image).toBeUndefined();
    // Annotation edits never disturb the answer key's geometry.
    expect(placeContentOf(lastPutBody)?.correctPositions).toEqual(placeContent.correctPositions);
  });

  it("backfills a legacy id-less item on load, then addresses it by that id", async () => {
    await renderUsePlaceOnImageEditor(slideWith(legacyContent));

    // Opening the slide writes the repair once, ids and colors together.
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    const repairedContent = placeContentOf(lastPutBody);
    const repaired = repairedContent?.items;
    const mintedId = repaired?.[0].id ?? "";
    expect(mintedId).toBeTruthy();
    expect(mintedId).not.toBe("target_b");
    // The colorless item keeps exactly the palette default its position was
    // already rendering, so the repair is invisible to the author — and its
    // label rides through untouched.
    expect(repaired?.[0]).toEqual({
      id: mintedId,
      label: "Rivendell",
      color: paletteColorAt(0),
    });
    // The already-identified item keeps its id and is only given the color its
    // position was rendering — one write covers both fields, every item.
    expect(repaired?.[1]).toEqual({ ...legacyContent.items[1], color: paletteColorAt(1) });
    // Identity repair is not an answer-key edit: the minted id is keyed to
    // nothing, so the slide stays exactly as scored as it was.
    expect(repairedContent?.correctPositions).toEqual(legacyContent.correctPositions);

    // Reopen the slide as the repair persisted it: the minted id is the only
    // address the item has (there is no positional fallback any more), the view
    // publishes it, and there is nothing left to repair.
    if (!repairedContent) throw new Error("expected the backfill to have been written");
    lastPutBody = undefined;
    const result = await renderUsePlaceOnImageEditor(slideWith(repairedContent));
    expect(lastPutBody).toBeUndefined();
    const targets = result.current.question?.targets;
    expect(targets?.map((target) => target.id)).toEqual([mintedId, "target_b"]);
    // An unkeyed item reaches the view with no coordinates at all rather than a
    // made-up point — that is what the surface skips drawing.
    expect(targets?.[0].x).toBeUndefined();
    expect(targets?.[0].y).toBeUndefined();
    expect(targets?.[1]).toMatchObject({ x: 0.85, y: 0.3 });

    act(() => {
      result.current.actions.commitCorrectAnswer(mintedId, { x: 0.4, y: 0.6 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const moved = placeContentOf(lastPutBody);
    // The op reached the backfilled item: it gained a target, its neighbour's
    // is untouched, and the bank did not move.
    expect(moved?.correctPositions).toEqual({
      [mintedId]: { x: 0.4, y: 0.6 },
      target_b: { x: 0.85, y: 0.3 },
    });
    expect(moved?.items).toEqual(repaired);
  });

  it("ignores an op addressed to an item that no longer exists", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.commitCorrectAnswer("target_gone", { x: 0.4, y: 0.6 });
      result.current.actions.setItemColor("target_gone", "#ff8800");
      result.current.actions.removeItem("target_gone");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    // A stale id is inert: no item changed, none was dropped, and — the trap a
    // map-keyed answer key opens — no entry was minted for a phantom item.
    const content = placeContentOf(lastPutBody);
    expect(content?.items).toEqual(placeContent.items);
    expect(content?.correctPositions).toEqual(placeContent.correctPositions);
  });

  it("setTolerance clamps to the tolerance bounds and writes that one field", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.actions.setTolerance(0.9);
    });
    await vi.waitFor(() => expect(placeContentOf(lastPutBody)?.tolerance).toBe(0.5));

    act(() => {
      result.current.actions.setTolerance(0.001);
    });
    await vi.waitFor(() => expect(placeContentOf(lastPutBody)?.tolerance).toBe(0.02));

    // The knob is per-slide: the answer key and the bank survive a sweep.
    const content = placeContentOf(lastPutBody);
    expect(content?.correctPositions).toEqual(placeContent.correctPositions);
    expect(content?.items).toEqual(placeContent.items);
  });
});
