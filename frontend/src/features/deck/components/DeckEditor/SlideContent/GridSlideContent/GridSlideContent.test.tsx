// Covers the Grid bank row's target affordances, the one place Grid diverges
// from the other placement banks: a grid has no centre cell to seed, so "Set
// target" only ARMS the item (the cells' "Place here" buttons then name it) and
// writes nothing, while "Clear target" on a placed item drops its answer-key
// entry through the editor.
import { configureStore } from "@reduxjs/toolkit";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { Provider } from "react-redux";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";

import { paletteColorAt } from "@/shared/components/Charts/optionPalette";
import { ModalProvider } from "@/shared/context/ModalProvider";
import { apiBaseUrl, emptySplitApi } from "@/shared/store/emptyApi";
import { ImageSlotContext } from "@deck/contexts/ImageSlotContext";
import {
  deckApi,
  type GridContent,
  type SlideRequest,
  type SlideResponse,
} from "@deck/store/deckApi.gen";
import { GridSlideContent } from "./GridSlideContent";

const DECK_ID = "deck-1";
const SLIDE_ID = "slide-grid";

const gridContent: GridContent = {
  contentType: "GRID",
  rowLabels: ["Forest", "Ocean"],
  colLabels: ["Small", "Large"],
  items: [
    { id: "it_a", label: "Fox", color: paletteColorAt(0) },
    { id: "it_b", label: "Crab", color: paletteColorAt(1) },
  ],
  // Fox is placed and keys an answer; Crab is unplaced.
  correctCells: { it_a: "0,0" },
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

let lastPutBody: SlideRequest | undefined;
let putCount = 0;
const server = setupServer(
  http.get(`${apiBaseUrl}/api/decks/${DECK_ID}/slides`, () => HttpResponse.json([gridSlide])),
  http.put(`${apiBaseUrl}/api/decks/${DECK_ID}/slides/${SLIDE_ID}`, async ({ request }) => {
    putCount += 1;
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
  putCount = 0;
});
afterAll(() => {
  server.close();
});

const renderGrid = async () => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  // Prime the slide-collection cache the deck editor would have populated.
  await store.dispatch(
    deckApi.util.upsertQueryData("listDeckSlides", { id: DECK_ID }, [gridSlide]),
  );
  render(
    <Provider store={store}>
      <ModalProvider>
        {/* The cover-image slot is router-driven chrome; an empty one keeps the
            editor renderable outside the deck-editor route. */}
        <ImageSlotContext value={{ imageConfig: null, setPreviewPlacement: () => undefined }}>
          <GridSlideContent deckId={DECK_ID} slideId={SLIDE_ID} />
        </ImageSlotContext>
      </ModalProvider>
    </Provider>,
  );
};

const gridContentOf = (body: SlideRequest | undefined) =>
  body?.content?.contentType === "GRID" ? body.content : undefined;

describe("GridSlideContent target affordances", () => {
  it("shows the question mark on an unplaced item and the check on a placed one", async () => {
    await renderGrid();

    expect(
      screen.getByRole("button", { name: "Clear the target position for target 1" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Set a target position for target 2" }),
    ).toBeInTheDocument();
    // The placed row carries its cell name as trailing meta.
    expect(screen.getByText("Forest × Small")).toBeInTheDocument();
  });

  it("arms the item instead of seeding a target when setting one, writing nothing", async () => {
    const user = userEvent.setup();
    await renderGrid();

    // Nothing is armed yet, so no cell offers to place anything.
    expect(screen.getAllByRole("button", { name: /^Place an item in/ })).not.toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Set a target position for target 2" }));

    // Every cell now offers to place Crab — the author names the cell, the row
    // never guesses one.
    expect(await screen.findByRole("button", { name: "Place Crab in Ocean × Large" })).toBeEnabled();
    expect(putCount).toBe(0);
  });

  it("clears a placed item's target through the editor", async () => {
    const user = userEvent.setup();
    await renderGrid();

    await user.click(
      screen.getByRole("button", { name: "Clear the target position for target 1" }),
    );

    await vi.waitFor(() => {
      expect(gridContentOf(lastPutBody)?.correctCells).toEqual({});
    });
  });
});
