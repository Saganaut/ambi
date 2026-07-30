// Behavioural tests for the Gallery tab's two interaction modes: the two-step
// selection the image picker opts into (single click selects, double click
// picks, Enter on the selected tile picks) and the legacy click-to-pick the
// AvatarPicker still relies on, where Enter picks in one step. The listImages
// read runs for real against MSW on a fresh RTK Query store per test.
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { GalleryImageResponse } from "@features/gallery/store/galleryApi.gen";
import { GalleryTab } from "./GalleryTab";

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

const server = setupServer(
  http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
    HttpResponse.json({ content: [sunset, harbour] }),
  ),
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
});

interface RenderOptions {
  /** Omit to render in legacy click-to-pick mode (the AvatarPicker's usage). */
  selectable?: boolean;
  selectedId?: string;
}

const renderTab = ({ selectable = true, selectedId }: RenderOptions = {}) => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPick = vi.fn();
  const onSelect = vi.fn();
  render(
    <Provider store={store}>
      <GalleryTab
        galleryId='g1'
        onPick={onPick}
        selectedId={selectedId}
        onSelect={selectable ? onSelect : undefined}
      />
    </Provider>,
  );
  return { onPick, onSelect };
};

/** The tile's accessible name repeats the image name (thumb alt + caption). */
const tile = async (name: string) =>
  await screen.findByRole("button", { name: new RegExp(name) });

describe("GalleryTab", () => {
  it("selects a tile on single click instead of picking it", async () => {
    const user = userEvent.setup();
    const { onPick, onSelect } = renderTab();

    await user.click(await tile("Sunset"));

    expect(onSelect).toHaveBeenCalledWith(sunset);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("marks the selected tile pressed and badges it", async () => {
    renderTab({ selectedId: "gi-1" });

    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(await tile("Harbour")).toHaveAttribute("aria-pressed", "false");
  });

  it("deselects when the already-selected tile is clicked again", async () => {
    const user = userEvent.setup();
    const { onPick, onSelect } = renderTab({ selectedId: "gi-1" });

    await user.click(await tile("Sunset"));

    expect(onSelect).toHaveBeenCalledWith(null);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("picks immediately on double click, firing onPick exactly once", async () => {
    const user = userEvent.setup();
    const { onPick } = renderTab();

    await user.dblClick(await tile("Sunset"));

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
  });

  it("selects on Enter and picks on a second Enter", async () => {
    const user = userEvent.setup();
    const { onPick, onSelect } = renderTab();

    (await tile("Sunset")).focus();
    await user.keyboard("{Enter}");

    expect(onSelect).toHaveBeenCalledWith(sunset);
    expect(onPick).not.toHaveBeenCalled();
  });

  it("picks with Enter on the already-selected tile rather than deselecting", async () => {
    const user = userEvent.setup();
    const { onPick, onSelect } = renderTab({ selectedId: "gi-1" });

    (await tile("Sunset")).focus();
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it("picks on a single click when selection mode is off", async () => {
    const user = userEvent.setup();
    const { onPick } = renderTab({ selectable: false });

    const sunsetTile = await tile("Sunset");
    // Click-to-pick tiles are actions, not toggles — no pressed state.
    expect(sunsetTile).not.toHaveAttribute("aria-pressed");

    await user.click(sunsetTile);

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
  });

  it("picks on a single Enter when selection mode is off", async () => {
    const user = userEvent.setup();
    const { onPick } = renderTab({ selectable: false });

    (await tile("Sunset")).focus();
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
  });

  it("filters the grid by name", async () => {
    const user = userEvent.setup();
    renderTab();
    await tile("Sunset");

    await user.type(screen.getByLabelText("Search gallery by name"), "harb");

    expect(screen.queryByRole("button", { name: /Sunset/ })).not.toBeInTheDocument();
    expect(await tile("Harbour")).toBeInTheDocument();
  });
});
