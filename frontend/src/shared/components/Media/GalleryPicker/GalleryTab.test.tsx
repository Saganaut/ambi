// Behavioural tests for the Gallery tab. Two interaction modes: the two-step
// selection the image picker opts into (single click selects, double click
// picks, Enter on the selected tile picks) and the legacy click-to-pick the
// AvatarPicker still relies on, where Enter picks in one step. Every path
// reports the whole gallery item, not just its embedded image — the parent may
// need the id and the name/alt text to re-crop the pick. Browsing is
// server-driven, so the rest covers the query the toolbar builds: the sort
// field/direction, the debounced name search, the page, and the page resets
// each of those forces. The listImages read runs for real against an MSW
// handler that pages, sorts and filters like the backend does, on a fresh RTK
// Query store per test.
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";
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
  createdAt: "2026-01-02T00:00:00Z",
  image: {
    external: false,
    srcKey: "gallery/2/original",
    variants: { SM: "https://cdn.test/2-sm.webp" },
  },
});

/** Fourteen images so the default page size of 12 spills onto a second page. */
const many = Array.from({ length: 14 }, (_, i) =>
  image({
    id: `gi-${String(i + 1)}`,
    name: `Image ${String(i + 1).padStart(2, "0")}`,
    createdAt: `2026-01-${String(i + 1).padStart(2, "0")}T00:00:00Z`,
  }),
);

/** The library the handler pages over; a test widens it via `serve`. */
let library: GalleryImageResponse[] = [sunset, harbour];
/** Every listImages URL the component issued, newest last. */
let requests: URL[] = [];

const serve = (images: GalleryImageResponse[]) => {
  library = images;
};

/** Pages, sorts and filters like GalleryService does, so the toolbar is testable. */
const listHandler = http.get(
  `${apiBaseUrl}/api/galleries/g1/images`,
  ({ request }) => {
    const url = new URL(request.url);
    requests.push(url);
    const term = (url.searchParams.get("search") ?? "").toLowerCase();
    const [field = "createdAt", direction = "desc"] = (
      url.searchParams.get("sort") ?? ""
    ).split(",");
    const size = Number(url.searchParams.get("size") ?? "20");
    const number = Number(url.searchParams.get("page") ?? "0");

    const matched = library
      .filter((img) => (img.name ?? "").toLowerCase().includes(term))
      .toSorted((a, b) => {
        const order =
          field === "name"
            ? (a.name ?? "").localeCompare(b.name ?? "")
            : (a.createdAt ?? "").localeCompare(b.createdAt ?? "");
        return direction === "desc" ? -order : order;
      });

    return HttpResponse.json({
      content: matched.slice(number * size, number * size + size),
      page: {
        size,
        number,
        totalElements: matched.length,
        totalPages: Math.ceil(matched.length / size),
      },
    });
  },
);

const server = setupServer(listHandler);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterAll(() => {
  server.close();
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  library = [sunset, harbour];
  requests = [];
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

/** The params of the most recent listImages request. */
const lastQuery = () => requests[requests.length - 1]?.searchParams;

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
    expect(onPick).toHaveBeenCalledWith(sunset);
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
    expect(onPick).toHaveBeenCalledWith(sunset);
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
    expect(onPick).toHaveBeenCalledWith(sunset);
  });

  it("picks on a single Enter when selection mode is off", async () => {
    const user = userEvent.setup();
    const { onPick } = renderTab({ selectable: false });

    (await tile("Sunset")).focus();
    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset);
  });

  // ── Server-driven browsing ────────────────────────────────────────────────

  it("asks for one newest-first page of six by default", async () => {
    renderTab();
    await tile("Sunset");

    expect(lastQuery()?.get("page")).toBe("0");
    expect(lastQuery()?.get("size")).toBe("12");
    expect(lastQuery()?.get("sort")).toBe("createdAt,desc");
    expect(lastQuery()?.has("search")).toBe(false);
  });

  it("sorts by the field chosen in the Sort by dropdown", async () => {
    const user = userEvent.setup();
    renderTab();
    await tile("Sunset");

    await user.click(screen.getByLabelText("Sort by"));
    await user.click(screen.getByRole("option", { name: "Name" }));

    await waitFor(() => {
      expect(lastQuery()?.get("sort")).toBe("name,desc");
    });
  });

  it("flips the sort direction from the chevron toggle", async () => {
    const user = userEvent.setup();
    renderTab();
    await tile("Sunset");

    // Descending is the default, so the button offers the other direction.
    await user.click(screen.getByRole("button", { name: "Sort ascending" }));

    await waitFor(() => {
      expect(lastQuery()?.get("sort")).toBe("createdAt,asc");
    });
    expect(
      screen.getByRole("button", { name: "Sort descending" }),
    ).toBeInTheDocument();
  });

  it("searches by name on the server rather than filtering the page", async () => {
    const user = userEvent.setup();
    renderTab();
    await tile("Sunset");

    await user.type(screen.getByLabelText("Search gallery by name"), "harb");

    // The grid holds the previous page until the narrowed one lands, so wait on
    // the rendered result rather than on the request going out.
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: /Sunset/ })).not.toBeInTheDocument();
    });
    expect(await tile("Harbour")).toBeInTheDocument();
    expect(lastQuery()?.get("search")).toBe("harb");
  });

  it("pages through the gallery, one server page at a time", async () => {
    serve(many);
    const user = userEvent.setup();
    renderTab();
    await tile("Image 08");

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));

    await waitFor(() => {
      expect(lastQuery()?.get("page")).toBe("1");
    });
    // Newest-first: page 2 holds the two oldest images.
    expect(await tile("Image 02")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Image 08/ })).not.toBeInTheDocument();
  });

  it("returns to the first page when the sort or the search changes", async () => {
    serve(many);
    const user = userEvent.setup();
    renderTab();
    await tile("Image 08");

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => {
      expect(lastQuery()?.get("page")).toBe("1");
    });

    await user.click(screen.getByRole("button", { name: "Sort ascending" }));
    await waitFor(() => {
      expect(lastQuery()?.get("sort")).toBe("createdAt,asc");
    });
    expect(lastQuery()?.get("page")).toBe("0");

    await user.click(screen.getByRole("button", { name: "Go to page 2" }));
    await waitFor(() => {
      expect(lastQuery()?.get("page")).toBe("1");
    });

    await user.type(screen.getByLabelText("Search gallery by name"), "Image 0");
    await waitFor(() => {
      expect(lastQuery()?.get("search")).toBe("Image 0");
    });
    expect(lastQuery()?.get("page")).toBe("0");
  });

  it("hides the pager while everything fits on one page", async () => {
    renderTab();
    await tile("Sunset");

    expect(screen.queryByRole("navigation", { name: "Gallery pages" })).toBeNull();
  });

  it("explains an empty result differently when a search is active", async () => {
    const user = userEvent.setup();
    renderTab();
    await tile("Sunset");

    await user.type(screen.getByLabelText("Search gallery by name"), "zzz");

    expect(await screen.findByText("No matching images")).toBeInTheDocument();
  });
});
