// Behavioural tests for the picker's two-step gallery flow: a click selects
// (rather than inserting) and arms the contextual Insert/Delete actions, a
// second click or a click outside the grid clears it, a double click — or a
// second Enter on the focused tile — inserts straight away, and Delete confirms
// inline and removes the image without leaving the modal. Also covers the
// awkward edges: a failed delete rolling back, a selection made while a delete
// is in flight surviving it, and clicks on the confirmation's own prompt text
// being inert. Also covers the crop config: a required crop routes every pick
// through the editor, a deck target sends the result to the deck's own namespace
// with no gallery write at all, and an optional crop leaves Insert meaning "as
// it stands". The gallery reads/writes run for real against MSW on a fresh RTK
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
vi.mock("@utils/imageEditing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/imageEditing")>();
  return {
    ...actual,
    fetchGalleryImageFile: (galleryId: string, imageId: string) =>
      fetchGalleryImageFile(galleryId, imageId) as Promise<Blob>,
    fetchRemoteImage: (url: string) => fetchRemoteImage(url) as Promise<Blob>,
    getCroppedBlob: (...args: unknown[]) => getCroppedBlob(...args) as Promise<Blob>,
  };
});

// Stub the crop editor (reached through CropAndSaveStep): surface its prefills
// and expose its two actions, so a test can walk pick → crop → upload without
// react-easy-crop/canvas.
vi.mock("./ImageCropEditor", () => ({
  ImageCropEditor: (props: {
    initialName?: string;
    initialAltText?: string;
    initialArea?: { x: number; y: number };
    onConfirm: (r: { area: unknown; name: string; altText: string }) => void;
    onCancel: () => void;
    onUseOriginal?: (r: { name: string; altText: string }) => void;
  }) => (
    <div data-testid='crop-editor'>
      <span data-testid='crop-name'>{props.initialName}</span>
      <span data-testid='crop-alt'>{props.initialAltText}</span>
      <span data-testid='crop-area'>{JSON.stringify(props.initialArea)}</span>
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
      {props.onUseOriginal && (
        <button
          onClick={() => {
            props.onUseOriginal?.({ name: "Original", altText: "alt" });
          }}>
          use-original
        </button>
      )}
      <button onClick={props.onCancel}>cancel-crop</button>
    </div>
  ),
}));

import { GalleryPicker } from "./GalleryPicker";
import type { CropConfig } from "./cropConfig";

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

/** What the deck route returns for a placement-only crop. */
const deckImage = {
  external: false,
  srcKey: "deck/d1/abc/original",
  variants: {},
};

let deleted: string[] = [];
let uploadRequests = 0;
let deckUploads = 0;
/**
 * The gallery as the server holds it. Browsing is server-driven now, so every
 * write re-reads the list: a handler that answered from a frozen array would
 * hand a deleted image straight back.
 */
let library: GalleryImageResponse[] = [];

const server = setupServer(
  http.get(`${apiBaseUrl}/api/galleries/mine`, () =>
    HttpResponse.json({ id: "g1", name: "My gallery" }),
  ),
  http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
    HttpResponse.json({
      content: library,
      page: {
        size: 6,
        number: 0,
        totalElements: library.length,
        totalPages: 1,
      },
    }),
  ),
  http.post(`${apiBaseUrl}/api/galleries/g1/images/upload`, () => {
    uploadRequests += 1;
    library = [...library, cropped];
    return HttpResponse.json(cropped, { status: 201 });
  }),
  http.post(`${apiBaseUrl}/api/decks/d1/images/upload`, () => {
    deckUploads += 1;
    return HttpResponse.json(deckImage, { status: 201 });
  }),
  http.delete(`${apiBaseUrl}/api/galleries/g1/images/:imageId`, ({ params }) => {
    const imageId = String(params.imageId);
    deleted.push(imageId);
    library = library.filter((img) => img.id !== imageId);
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
  library = [sunset, harbour];
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
  deckUploads = 0;
});

const renderPicker = ({
  crop = { mode: "off", aspect: 1 } as CropConfig,
  deckId,
  current,
}: {
  crop?: CropConfig;
  deckId?: string;
  current?: GalleryImageResponse["image"];
} = {}) => {
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
        crop={crop}
        deckId={deckId}
        current={current}
      />
    </Provider>,
  );
  return { onPick, onClose };
};

const REQUIRED: CropConfig = { mode: "required", aspect: 1 };

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
    // Unless the crop is required the stored image goes straight through — no
    // re-fetch, no crop step, no second copy in the gallery.
    expect(fetchGalleryImageFile).not.toHaveBeenCalled();
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(uploadRequests).toBe(0);
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

describe("GalleryPicker with a required crop", () => {
  it("opens the crop editor on the picked image's bytes, prefilled from it", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ crop: REQUIRED });

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
    const { onPick } = renderPicker({ crop: REQUIRED });

    await user.dblClick(await tile("Sunset"));
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(
        expect.objectContaining({ srcKey: cropped.image.srcKey }),
      );
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
    renderPicker({ crop: REQUIRED });

    await user.dblClick(await tile("Logo"));

    expect(fetchRemoteImage).toHaveBeenCalledWith("https://cdn.test/logo.png");
    expect(fetchGalleryImageFile).not.toHaveBeenCalled();
    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
  });

  it("returns to the grid with the selection intact when the crop is cancelled", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ crop: REQUIRED });

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
    const { onPick } = renderPicker({ crop: REQUIRED });

    await user.click(await tile("Sunset"));
    await user.click(insertBtn());

    expect(await screen.findByText("Image file not found")).toBeInTheDocument();
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(await tile("Sunset")).toHaveAttribute("aria-pressed", "true");
    expect(onPick).not.toHaveBeenCalled();
  });
});

describe("GalleryPicker with a deck target", () => {
  const withDeck = { crop: REQUIRED, deckId: "d1" };

  it("stores the crop in the deck's namespace, leaving the gallery alone", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker(withDeck);

    await user.dblClick(await tile("Sunset"));
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledTimes(1);
    });
    // The whole point: ten options cropped from one gallery image leave one
    // gallery entry, not eleven.
    expect(deckUploads).toBe(1);
    expect(uploadRequests).toBe(0);
    const picked = onPick.mock.calls[0][0] as { srcKey?: string };
    expect(picked.srcKey).toBe("deck/d1/abc/original");
  });

  it("stamps the crop with the gallery image and rect it came from", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker(withDeck);

    await user.dblClick(await tile("Sunset"));
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledTimes(1);
    });
    const picked = onPick.mock.calls[0][0] as {
      metadata?: Record<string, unknown>;
    };
    expect(picked.metadata?.crop).toEqual({
      sourceGalleryId: "g1",
      sourceImageId: "gi-1",
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
  });
});

describe("GalleryPicker with an optional crop", () => {
  const optional: CropConfig = { mode: "optional", aspect: 1 };

  it("keeps Insert meaning 'as it stands' and offers cropping beside it", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ crop: optional, deckId: "d1" });

    await user.click(await tile("Sunset"));
    await user.click(insertBtn());

    expect(onPick).toHaveBeenCalledWith(sunset.image);
    expect(fetchGalleryImageFile).not.toHaveBeenCalled();
    expect(deckUploads).toBe(0);
  });

  it("routes the pick through the editor when cropping is chosen", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ crop: optional, deckId: "d1" });

    await user.click(await tile("Sunset"));
    await user.click(screen.getByRole("button", { name: "Crop & insert" }));

    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "confirm-crop" }));

    await waitFor(() => {
      expect(deckUploads).toBe(1);
    });
    expect(onPick).toHaveBeenCalledTimes(1);
  });

  it("embeds the untouched original when the crop step is skipped", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker({ crop: optional, deckId: "d1" });

    await user.click(await tile("Sunset"));
    await user.click(screen.getByRole("button", { name: "Crop & insert" }));
    await user.click(await screen.findByRole("button", { name: "use-original" }));

    await waitFor(() => {
      expect(onPick).toHaveBeenCalledWith(sunset.image);
    });
    expect(deckUploads).toBe(0);
    expect(uploadRequests).toBe(0);
  });
});

describe("GalleryPicker re-cropping a placement", () => {
  /** A placed crop that still names the gallery image it was cut from. */
  const placed = {
    external: false,
    srcKey: "deck/d1/abc/original",
    variants: {},
    metadata: {
      crop: {
        sourceGalleryId: "g1",
        sourceImageId: "gi-1",
        x: 12,
        y: 34,
        width: 200,
        height: 200,
      },
    },
  };

  it("reopens the editor on the original at the rect the crop used", async () => {
    const user = userEvent.setup();
    renderPicker({ crop: REQUIRED, deckId: "d1", current: placed });

    await user.click(screen.getByRole("button", { name: "Adjust crop" }));

    // The source, not the already-cropped bytes — widening the frame has to be
    // possible, so a crop of a crop is exactly what must not happen.
    expect(fetchGalleryImageFile).toHaveBeenCalledWith("g1", "gi-1");
    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
    expect(screen.getByTestId("crop-area")).toHaveTextContent(
      '{"galleryId":"g1","imageId":"gi-1","x":12,"y":34,"width":200,"height":200}',
    );
  });

  it("hides the affordance for a placement with no reachable source", async () => {
    renderPicker({
      crop: REQUIRED,
      deckId: "d1",
      current: { external: false, srcKey: "deck/d1/xyz/original", variants: {} },
    });

    await screen.findByRole("button", { name: "Insert" });
    expect(screen.queryByRole("button", { name: "Adjust crop" })).not.toBeInTheDocument();
  });
});
