// Pins the Matching editor's structural invariant: `correctPairs` is either
// empty (unscored, collect-only) or the exact mirror of the authored pairing
// (left[i] id → right[i] id), and structural pair ops keep a populated key in
// lockstep. Also pins the MATCHING default-content shape `buildDefaultContent`
// mints for a brand-new slide (two blank pairs, unscored, EXACT fixed).
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
  type MatchingContent,
  type SlideRequest,
  type SlideResponse,
} from "../store/deckApi.gen";
import { buildDefaultContent } from "../utils/slideContent";
import { useMatchingEditor } from "./useMatchingEditor";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-matching";

const matchingContent: MatchingContent = {
  contentType: "MATCHING",
  left: [
    { id: "left_a", label: "Andúril" },
    { id: "left_b", label: "Sting" },
    { id: "left_c", label: "Glamdring" },
  ],
  right: [
    { id: "right_a", label: "Aragorn" },
    { id: "right_b", label: "Frodo" },
    { id: "right_c", label: "Gandalf" },
  ],
  correctPairs: {
    left_a: "right_a",
    left_b: "right_b",
    left_c: "right_c",
  },
  scoreMode: "EXACT",
};

const matchingSlide: SlideResponse = {
  id: SLIDE_ID,
  title: "Match each blade to its bearer",
  createdByUserId: "u1",
  lastEditedByUserId: "u1",
  version: 1,
  content: matchingContent,
};

// Capture each outgoing PUT body and echo the slide back so the mutation resolves.
let lastPutBody: SlideRequest | undefined;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([matchingSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    lastPutBody = (await request.json()) as SlideRequest;
    return HttpResponse.json({ ...matchingSlide, ...lastPutBody });
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

const renderUseMatchingEditor = async (content: MatchingContent = matchingContent) => {
  const store = makeStore();
  const slide = { ...matchingSlide, content };
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [slide]));
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useMatchingEditor(DECK_ID, SLIDE_ID), { wrapper }).result;
};

const matchingContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "MATCHING" ? body.content : undefined;

describe("buildDefaultContent(MATCHING)", () => {
  it("mints two blank unscored pairs with EXACT fixed", () => {
    const content = buildDefaultContent("MATCHING");
    if (content.contentType !== "MATCHING") throw new Error("expected MATCHING content");

    expect(content.left).toHaveLength(2);
    expect(content.right).toHaveLength(2);
    // Fresh client-minted ids on every card so the Scorable toggle can link them.
    const ids = [...content.left, ...content.right].map((card) => card.id);
    expect(new Set(ids).size).toBe(4);
    ids.forEach((id) => expect(id).toBeTruthy());
    // Unscored until the author flips the Scorable toggle.
    expect(content.correctPairs).toEqual({});
    expect(content.scoreMode).toBe("EXACT");
  });
});

describe("useMatchingEditor structural ops", () => {
  it("zips left/right into pairs and reads a populated key as scorable", async () => {
    const result = await renderUseMatchingEditor();

    expect(result.current.question?.pairs.map((pair) => [pair.left.id, pair.right.id])).toEqual([
      ["left_a", "right_a"],
      ["left_b", "right_b"],
      ["left_c", "right_c"],
    ]);
    expect(result.current.question?.scorable).toBe(true);
  });

  it("addPair appends a blank card to each column and links it while scored", async () => {
    const result = await renderUseMatchingEditor();

    act(() => {
      result.current.addPair();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = matchingContentOf(lastPutBody);
    expect(content?.left).toHaveLength(4);
    expect(content?.right).toHaveLength(4);
    const newLeft = content?.left[3];
    const newRight = content?.right[3];
    expect(newLeft?.id).toBeTruthy();
    expect(newLeft?.label).toBe("");
    // The scored key stays the exact mirror of the authored pairing.
    expect(content?.correctPairs).toEqual({
      ...matchingContent.correctPairs,
      [newLeft?.id ?? ""]: newRight?.id,
    });
  });

  it("addPair leaves an unscored slide unscored", async () => {
    const result = await renderUseMatchingEditor({ ...matchingContent, correctPairs: {} });

    act(() => {
      result.current.addPair();
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    expect(matchingContentOf(lastPutBody)?.correctPairs).toEqual({});
  });

  it("removePair drops both cards and the pair's answer-key entry", async () => {
    const result = await renderUseMatchingEditor();

    act(() => {
      result.current.removePair("left_b");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = matchingContentOf(lastPutBody);
    expect(content?.left.map((card) => card.id)).toEqual(["left_a", "left_c"]);
    expect(content?.right.map((card) => card.id)).toEqual(["right_a", "right_c"]);
    expect(content?.correctPairs).toEqual({ left_a: "right_a", left_c: "right_c" });
  });

  it("removePair refuses to drop below the two-pair minimum", async () => {
    const result = await renderUseMatchingEditor({
      ...matchingContent,
      left: matchingContent.left.slice(0, 2),
      right: matchingContent.right.slice(0, 2),
      correctPairs: { left_a: "right_a", left_b: "right_b" },
    });

    expect(result.current.canRemovePair).toBe(false);
    act(() => {
      result.current.removePair("left_a");
    });
    // No PUT goes out — give the debounce window a beat to prove it.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(lastPutBody).toBeUndefined();
  });

  it("setScorable mirrors the authored pairing into the key and re-asserts EXACT", async () => {
    const result = await renderUseMatchingEditor({
      ...matchingContent,
      correctPairs: {},
      scoreMode: "PARTIAL",
    });

    expect(result.current.question?.scorable).toBe(false);
    act(() => {
      result.current.setScorable(true);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    const content = matchingContentOf(lastPutBody);
    expect(content?.correctPairs).toEqual(matchingContent.correctPairs);
    expect(content?.scoreMode).toBe("EXACT");
  });

  it("setScorable(false) clears the key", async () => {
    const result = await renderUseMatchingEditor();

    act(() => {
      result.current.setScorable(false);
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());

    expect(matchingContentOf(lastPutBody)?.correctPairs).toEqual({});
  });

  it("card patches address one card on one side and never disturb the key", async () => {
    const result = await renderUseMatchingEditor();

    act(() => {
      result.current.setCardColor("right", "right_b", "#ff8800");
    });
    await vi.waitFor(() => expect(lastPutBody).toBeDefined());
    let content = matchingContentOf(lastPutBody);
    expect(content?.right.find((card) => card.id === "right_b")?.color).toBe("#ff8800");
    expect(content?.left.every((card) => card.color === undefined)).toBe(true);

    const image = { external: true, externalSrc: "https://example.test/sting.png" };
    act(() => {
      result.current.setCardImage("left", "left_b", image);
    });
    await vi.waitFor(() =>
      expect(
        matchingContentOf(lastPutBody)?.left.find((card) => card.id === "left_b")?.image,
      ).toEqual(image),
    );
    content = matchingContentOf(lastPutBody);
    // Structural menu edits never disturb the answer key.
    expect(content?.correctPairs).toEqual(matchingContent.correctPairs);
  });
});
