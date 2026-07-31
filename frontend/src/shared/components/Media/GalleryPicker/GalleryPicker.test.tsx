// Behavioural tests for the picker's two-step gallery flow: a click selects
// (rather than inserting) and arms the contextual Insert/Delete actions, a
// second click or a click outside the grid clears it, a double click — or a
// second Enter on the focused tile — inserts straight away, and Delete confirms
// inline and removes the image without leaving the modal. Also covers the
// awkward edges: a failed delete rolling back, a selection made while a delete
// is in flight surviving it, and clicks on the confirmation's own prompt text
// being inert. Also covers `cropGalleryPicks`, where a gallery pick is re-cropped
// to the caller's aspect and stored as a new image instead of being inserted as
// it stands. The gallery reads/writes run for real against MSW on a fresh RTK
// Query store per test, with the gallery cache-sync rules registered so a
// delete splices the tile out of the cached page.
import {
  describe,
  it,
  expect,
  vi,
  beforeAll,
  afterAll,
  afterEach,
  beforeEach,
} from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { GalleryImageResponse } from "@features/gallery/store/galleryApi.gen";
import "@features/gallery/store/enhancements/gallery";

// The crop path's byte-fetching and canvas work are jsdom-hostile; stub them and
// drive the source blobs by hand.
const fetchGalleryImageFile = vi.fn();
const fetchRemoteImage = vi.fn();
const getCroppedBlob = vi.fn();
vi.mock("@utils/imageEditing", () => ({
  fetchGalleryImageFile: (galleryId: string, imageId: string) =>
    fetchGalleryImageFile(galleryId, imageId) as Promise<Blob>,
  fetchRemoteImage: (url: string) => fetchRemoteImage(url) as Promise<Blob>,
  getCroppedBlob: (...args: unknown[]) => getCroppedBlob(...args) as Promise<Blob>,
}));

// Stub the crop editor (reached through CropAndSaveStep): surface its prefills
// and expose its two actions, so a test can walk pick → crop → upload without
// react-easy-crop/canvas.
vi.mock("./ImageCropEditor", () => ({
  ImageCropEditor: (props: {
    initialName?: string;
    initialAltText?: string;
    onConfirm: (r: { area: unknown; name: string; altText: string }) => void;
    onCancel: () => void;
  }) => (
    <div data-testid='crop-editor'>
      <span data-testid='crop-name'>{props.initialName}</span>
      <span data-testid='crop-alt'>{props.initialAltText}</span>
      <button
        onClick={() =>
          props.onConfirm({
            area: { x: 0, y: 0, width: 10, height: 10 },
            name: "Cropped",
            altText: "alt",
          })
        }>
        confirm-crop
      </button>
      <button onClick={props.onCancel}>cancel-crop</button>
    </div>
  ),
}));

import { GalleryPicker } from "./GalleryPicker";

const image = (
  overrides: Partial<GalleryImageResponse> = {},
): GalleryImageResponse => ({
  id: "gi-1",
  galleryId: "g1",
  image: {
    external: false,
    srcKey: "gallery/1/original",
    altText: "A sunset over the sea",
    variants: { SM: "https://cdn.test/1-sm.webp" },
  },
  name: "Sunset",
  creatorUserId: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  ...overrides,
});

/** The image the upload route mints for a re-cropped pick. */
const cropped: GalleryImageResponse = image({
  id: "gi-cropped",
  name: "Cropped",
  image: { external: false, srcKey: "gallery/cropped/original", variants: {} },
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
let uploadRequests = 0;

const server = setupServer(
  http.get(`${apiBaseUrl}/api/galleries/mine`, () =>
    HttpResponse.json({ id: "g1", name: "My gallery" }),
  ),
  http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
    HttpResponse.json({ content: [sunset, harbour] }),
  ),
  http.post(`${apiBaseUrl}/api/galleries/g1/images/upload`, () => {
    uploadRequests += 1;
    return HttpResponse.json(cropped, { status: 201 });
  }),
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
beforeEach(() => {
  // jsdom implements neither; the crop step frees its blob URL when it's left.
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
  globalThis.URL.revokeObjectURL = vi.fn();
  fetchGalleryImageFile.mockResolvedValue(new Blob(["img"], { type: "image/png" }));
  fetchRemoteImage.mockResolvedValue(new Blob(["img"], { type: "image/png" }));
  getCroppedBlob.mockResolvedValue(new Blob(["cropped"], { type: "image/webp" }));
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  deleted = [];
  uploadRequests = 0;
});

const renderPicker = ({ cropGalleryPicks = false } = {}) => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <GalleryPicker
        onPick={onPick}
        onClose={onClose}
        cropWidth={1}
        cropHeight={1}
        cropGalleryPicks={cropGalleryPicks}
      />
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
    // Without cropGalleryPicks the stored image goes straight through — no
    // re-fetch, no crop step, no second copy in the gallery.
    expect(fetchGalleryImageFile).not.toHaveBeenCalled();
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(uploadRequests).toBe(0);
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

  it("inserts on a second Enter without ever reaching the Insert button", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    const sunsetTile = await tile("Sunset");
    sunsetTile.focus();
    await user.keyboard("{Enter}");

    expect(sunsetTile).toHaveAttribute("aria-pressed", "true");
    expect(onPick).not.toHaveBeenCalled();

    await user.keyboard("{Enter}");

    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick).toHaveBeenCalledWith(sunset.image);
  });

  it("ignores clicks on the delete confirmation's prompt text", async () => {
    const user = userEvent.setup();
    renderPicker();

    await user.click(await tile("Sunset"));
    await user.click(deleteBtn());

    // The prompt is a bare <span role="status">, not a button — clicking the
    // very question must not silently answer it by clearing the selection.
    await user.click(screen.getByRole("status"));

    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeInTheDocument();
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
  });

  it("reports a failed delete and puts the image back, staying open", async () => {
    const user = userEvent.setup();
    server.use(
      http.delete(`${apiBaseUrl}/api/galleries/g1/images/:imageId`, () =>
        HttpResponse.json({ detail: "Image is still in use." }, { status: 409 }),
      ),
    );
    const { onPick, onClose } = renderPicker();

    await user.click(await tile("Sunset"));
    await user.click(deleteBtn());
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    expect(await screen.findByText("Image is still in use.")).toBeInTheDocument();
    // The optimistic splice rolled back: both tiles are present, the target is
    // still selected, and the confirmation stays armed for a retry.
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(await tile("Harbour")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirm delete" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeEnabled();
    expect(deleted).toEqual([]);
    expect(onPick).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("keeps a selection made while a delete is still in flight", async () => {
    const user = userEvent.setup();
    let release = () => {
      /* replaced below */
    };
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    server.use(
      http.delete(
        `${apiBaseUrl}/api/galleries/g1/images/:imageId`,
        async ({ params }) => {
          await gate;
          deleted.push(String(params.imageId));
          return new HttpResponse(null, { status: 204 });
        },
      ),
    );
    renderPicker();

    await user.click(await tile("Sunset"));
    await user.click(deleteBtn());
    await user.click(screen.getByRole("button", { name: "Confirm delete" }));

    // Nothing disables the grid mid-delete, so move the selection on before the
    // server answers; the resolution must not stomp it.
    await user.click(await tile("Harbour"));
    expect(await tile("Harbour")).toHaveAttribute("aria-pressed", "true");

    release();
    await waitFor(() => {
      expect(deleted).toEqual(["gi-1"]);
    });

    expect(await tile("Harbour")).toHaveAttribute("aria-pressed", "true");
    expect(insertBtn()).toBeEnabled();
    expect(deleteBtn()).toBeEnabled();
  });
});

describe("GalleryPicker with cropGalleryPicks", () => {
  it("opens the crop editor on the picked image's bytes, prefilled from it", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ cropGalleryPicks: true });

    await user.click(await tile("Sunset"));
    await user.click(insertBtn());

    // Bytes come from the same-origin /file route (a presigned URL would taint
    // the canvas), keyed by gallery + image id.
    expect(fetchGalleryImageFile).toHaveBeenCalledWith("g1", "gi-1");
    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
    expect(screen.getByTestId("crop-name")).toHaveTextContent("Sunset");
    expect(screen.getByTestId("crop-alt")).toHaveTextContent(
      "A sunset over the sea",
    );
    // Nothing is inserted until the crop is confirmed, and the picker's own
    // footer stands down in favour of the editor's Back / Use image.
    expect(onPick).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Insert" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Close" })).not.toBeInTheDocument();
  });

  it("uploads the crop and hands back the newly created image, not the source", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ cropGalleryPicks: true });

    await user.dblClick(await tile("Sunset"));
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(cropped.image);
    });
    expect(uploadRequests).toBe(1);
    expect(getCroppedBlob).toHaveBeenCalledWith("blob:mock", {
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    // The original is untouched — the crop is stored alongside it.
    expect(onPick).not.toHaveBeenCalledWith(sunset.image);
  });

  it("fetches an external image through the remote-image proxy instead", async () => {
    const user = userEvent.setup();
    server.use(
      http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
        HttpResponse.json({
          content: [
            image({
              id: "gi-ext",
              name: "Logo",
              image: { external: true, externalSrc: "https://cdn.test/logo.png" },
            }),
          ],
        }),
      ),
    );
    renderPicker({ cropGalleryPicks: true });

    await user.dblClick(await tile("Logo"));

    expect(fetchRemoteImage).toHaveBeenCalledWith("https://cdn.test/logo.png");
    expect(fetchGalleryImageFile).not.toHaveBeenCalled();
    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
  });

  it("returns to the grid with the selection intact when the crop is cancelled", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ cropGalleryPicks: true });

    await user.click(await tile("Sunset"));
    await user.click(insertBtn());
    await user.click(await screen.findByRole("button", { name: "cancel-crop" }));

    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(insertBtn()).toBeEnabled();
    expect(onPick).not.toHaveBeenCalled();
    expect(uploadRequests).toBe(0);
  });

  it("reports a failed byte fetch in the footer and stays on the grid", async () => {
    const user = userEvent.setup();
    fetchGalleryImageFile.mockRejectedValueOnce(new Error("Image file not found"));
    const { onPick } = renderPicker({ cropGalleryPicks: true });

    await user.click(await tile("Sunset"));
    await user.click(insertBtn());

    expect(await screen.findByText("Image file not found")).toBeInTheDocument();
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(onPick).not.toHaveBeenCalled();
  });
});
