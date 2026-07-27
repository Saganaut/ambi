// Pins the Place-on-Image editor's invariants: targets stay inside the
// normalized [0, 1] image box, the single tolerance knob keeps every target's
// wire `radius` in lockstep (and hands it to newly added targets), and every
// target op is addressed by id — including the `target-<index>` fallback that
// keeps id-less legacy targets reachable, and a stale id that must do nothing.
// Also pins the PLACE_ON_IMAGE default-content shape `buildDefaultContent`
// mints for a brand-new slide (no targets, INSIDE_RADIUS fixed).
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
  type PlaceOnImageContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { usePlaceOnImageEditor } from "./usePlaceOnImageEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-place";

const placeContent: PlaceOnImageContent = {
  contentType: "PLACE_ON_IMAGE",
  image: { external: true, externalSrc: "https://example.test/middle-earth.png" },
  correctTargets: [
    { id: "target_a", x: 0.2, y: 0.15, radius: 0.08 },
    { id: "target_b", x: 0.85, y: 0.3, radius: 0.08 },
  ],
  scoreMode: "INSIDE_RADIUS",
};

// A deck authored before targets carried ids on the wire: the first target is
// reachable only through its `target-<index>` fallback key.
const legacyContent: PlaceOnImageContent = {
  ...placeContent,
  correctTargets: [
    { x: 0.2, y: 0.15, radius: 0.08 },
    { id: "target_b", x: 0.85, y: 0.3, radius: 0.08 },
  ],
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
  it("mints a target-less pin drop with a blank image and INSIDE_RADIUS fixed", () => {
    const content = buildDefaultContent("PLACE_ON_IMAGE");
    if (content.contentType !== "PLACE_ON_IMAGE") {
      throw new Error("expected PLACE_ON_IMAGE content");
    }

    expect(content.image).toEqual({ external: true });
    // Unscored until the author places targets (collect-only is legitimate).
    expect(content.correctTargets).toEqual([]);
    expect(content.scoreMode).toBe("INSIDE_RADIUS");
  });
});

describe("usePlaceOnImageEditor target ops", () => {
  it("addTarget appends a clamped point with a fresh id and the shared radius", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.addTarget({ x: 1.4, y: -0.2 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const targets = placeContentOf(lastPutBody)?.correctTargets;
    expect(targets).toHaveLength(3);
    const added = targets?.[2];
    expect(added?.id).toBeTruthy();
    expect(added?.id).not.toBe("target_a");
    expect(added).toMatchObject({ x: 1, y: 0, radius: 0.08 });
    // Existing targets are untouched.
    expect(targets?.slice(0, 2)).toEqual(placeContent.correctTargets);
  });

  it("moveTarget writes a clamped normalized point to only the addressed target", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.moveTarget("target_a", { x: -0.4, y: 1.2 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const targets = placeContentOf(lastPutBody)?.correctTargets;
    expect(targets?.[0]).toEqual({ id: "target_a", x: 0, y: 1, radius: 0.08 });
    expect(targets?.[1]).toEqual(placeContent.correctTargets[1]);
  });

  it("removeTarget drops only the addressed target", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.removeTarget("target_a");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    expect(placeContentOf(lastPutBody)?.correctTargets).toEqual([placeContent.correctTargets[1]]);
  });

  it("label/color/image ops patch only the addressed target, never coordinates", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.scheduleTargetLabel("target_a", "Rivendell");
      result.current.flush();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let targets = placeContentOf(lastPutBody)?.correctTargets;
    expect(targets?.[0].label).toBe("Rivendell");
    expect(targets?.[1].label).toBeUndefined();

    act(() => {
      result.current.setTargetColor("target_b", "#ff8800");
    });
    await vi.waitFor(() =>
      expect(placeContentOf(lastPutBody)?.correctTargets[1].color).toBe("#ff8800"),
    );

    const image = { external: true, externalSrc: "https://example.test/rivendell.png" };
    act(() => {
      result.current.setTargetImage("target_a", image);
    });
    await vi.waitFor(() =>
      expect(placeContentOf(lastPutBody)?.correctTargets[0].image).toEqual(image),
    );

    targets = placeContentOf(lastPutBody)?.correctTargets;
    expect(targets?.[0].color).toBeUndefined();
    expect(targets?.[1].image).toBeUndefined();
    // Annotation edits never disturb the answer key's geometry.
    expect(targets?.map(({ x, y, radius }) => ({ x, y, radius }))).toEqual(
      placeContent.correctTargets.map(({ x, y, radius }) => ({ x, y, radius })),
    );
  });

  it("addresses a legacy id-less target through its target-<index> fallback key", async () => {
    const result = await renderUsePlaceOnImageEditor(slideWith(legacyContent));

    // The view hands the UI a usable address even with no wire id.
    expect(result.current.question?.targets.map((target) => target.id)).toEqual([
      "target-0",
      "target_b",
    ]);

    act(() => {
      result.current.moveTarget("target-0", { x: 0.4, y: 0.6 });
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const targets = placeContentOf(lastPutBody)?.correctTargets;
    // The fallback key never leaks onto the wire — only the coordinates move.
    expect(targets?.[0]).toEqual({ x: 0.4, y: 0.6, radius: 0.08 });
    expect(targets?.[1]).toEqual(legacyContent.correctTargets[1]);
  });

  it("ignores an op addressed to a target that no longer exists", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.moveTarget("target_gone", { x: 0.4, y: 0.6 });
      result.current.setTargetColor("target_gone", "#ff8800");
      result.current.removeTarget("target_gone");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    // A stale id is inert: no target moved, none was dropped.
    expect(placeContentOf(lastPutBody)?.correctTargets).toEqual(placeContent.correctTargets);
  });

  it("setTolerance clamps to the tolerance bounds and rewrites every radius", async () => {
    const result = await renderUsePlaceOnImageEditor();

    act(() => {
      result.current.setTolerance(0.9);
    });
    await vi.waitFor(() =>
      expect(placeContentOf(lastPutBody)?.correctTargets.map((t) => t.radius)).toEqual([0.5, 0.5]),
    );

    act(() => {
      result.current.setTolerance(0.001);
    });
    await vi.waitFor(() =>
      expect(placeContentOf(lastPutBody)?.correctTargets.map((t) => t.radius)).toEqual([
        0.02, 0.02,
      ]),
    );
    // Positions survive a tolerance sweep.
    expect(placeContentOf(lastPutBody)?.correctTargets.map(({ x, y }) => ({ x, y }))).toEqual([
      { x: 0.2, y: 0.15 },
      { x: 0.85, y: 0.3 },
    ]);
  });
});
