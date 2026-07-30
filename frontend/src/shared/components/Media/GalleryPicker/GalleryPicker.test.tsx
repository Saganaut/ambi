// Behavioural tests for the picker's two-step gallery flow: a click selects
// (rather than inserting) and arms the contextual Insert/Delete actions, a
// second click or a click outside the grid clears it, a double click inserts
// straight away, and Delete confirms inline and removes the image without
// leaving the modal. The gallery reads/writes run for real against MSW on a
// fresh RTK Query store per test, with the gallery cache-sync rules registered
// so a delete splices the tile out of the cached page.
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { GalleryImageResponse } from "@features/gallery/store/galleryApi.gen";
import "@features/gallery/store/enhancements/gallery";
import { GalleryPicker } from "./GalleryPicker";

const image = (
  overrides: Partial<GalleryImageResponse> = {},
): GalleryImageResponse => ({
  id: "gi-1",
  galleryId: "g1",
  image: {
    external: false,
    srcKey: "gallery/1/original",
    variants: { SM: "https://cdn.test/1-sm.webp" },
  },
  name: "Sunset",
  creatorUserId: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

const sunset = image();
const harbour = image({
  id: "gi-2",
  name: "Harbour",
  image: {
    external: false,
    srcKey: "gallery/2/original",
    variants: { SM: "https://cdn.test/2-sm.webp" },
  },
});

let deleted: string[] = [];

const server = setupServer(
  http.get(`${apiBaseUrl}/api/galleries/mine`, () =>
    HttpResponse.json({ id: "g1", name: "My gallery" }),
  ),
  http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
    HttpResponse.json({ content: [sunset, harbour] }),
  ),
  http.delete(`${apiBaseUrl}/api/galleries/g1/images/:imageId`, ({ params }) => {
    deleted.push(String(params.imageId));
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  deleted = [];
});

const renderPicker = () => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <GalleryPicker onPick={onPick} onClose={onClose} />
    </Provider>,
  );
  return { onPick, onClose };
};

/** The tile's accessible name repeats the image name (thumb alt + caption). */
const tile = async (name: string) =>
  await screen.findByRole("button", { name: new RegExp(name) });

const insertBtn = () => screen.getByRole("button", { name: "Insert" });
const deleteBtn = () => screen.getByRole("button", { name: "Delete" });

describe("GalleryPicker", () => {
  it("enables Insert and Delete only once a tile is selected", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    const sunsetTile = await tile("Sunset");
    expect(insertBtn()).toBeDisabled();
    expect(deleteBtn()).toBeDisabled();

    await user.click(sunsetTile);

    expect(sunsetTile).toHaveAttribute("aria-pressed", "true");
    expect(insertBtn()).toBeEnabled();
    expect(deleteBtn()).toBeEnabled();
    // Selecting is not inserting.
    expect(onPick).not.toHaveBeenCalled();
  });

  it("inserts the selected image when Insert is pressed", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    await user.click(await tile("Harbour"));
    await user.click(insertBtn());

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(harbour.image);
  });

  it("clears the selection when the selected tile is clicked again", async () => {
    const user = userEvent.setup();
    renderPicker();

    const sunsetTile = await tile("Sunset");
    await user.click(sunsetTile);
    await user.click(sunsetTile);

    expect(sunsetTile).toHaveAttribute("aria-pressed", "false");
    expect(insertBtn()).toBeDisabled();
    expect(deleteBtn()).toBeDisabled();
  });

  it("clears the selection when a click lands outside the image grid", async () => {
    const user = userEvent.setup();
    renderPicker();

    const sunsetTile = await tile("Sunset");
    await user.click(sunsetTile);
    expect(insertBtn()).toBeEnabled();

    await user.click(screen.getByLabelText("Search gallery by name"));

    expect(sunsetTile).toHaveAttribute("aria-pressed", "false");
    expect(insertBtn()).toBeDisabled();
    expect(deleteBtn()).toBeDisabled();
  });

  it("inserts immediately on double click, firing onPick exactly once", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    await user.dblClick(await tile("Sunset"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
  });

  it("deletes the selected image inline, leaving the picker open", async () => {
    const user = userEvent.setup();
    const { onPick, onClose } = renderPicker();

    await user.click(await tile("Sunset"));
    await user.click(deleteBtn());

    // Confirmation is a footer state, not a second modal — the picker is still
    // mounted behind it.
    expect(screen.getByText(/This can’t be undone/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Sunset/ })).not.toBeInTheDocument();
    });
    expect(deleted).toEqual(["gi-1"]);
    // Still in the picker, with the other image intact and the actions reset.
    expect(await tile("Harbour")).toBeInTheDocument();
    expect(insertBtn()).toBeDisabled();
    expect(deleteBtn()).toBeDisabled();
    expect(onPick).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps the image when the inline delete confirmation is cancelled", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(await tile("Sunset"));
    await user.click(deleteBtn());
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleted).toEqual([]);
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(deleteBtn()).toBeEnabled();
  });
});
