// Behavioural tests for the Upload tab. Two source paths converge on one flow —
// a blob URL → crop → multipart upload — so a pasted web URL is stored as owned
// bytes (fetched through the SSRF-guarded backend proxy) rather than kept as a
// fragile external reference. The crop-and-save half of that flow is the shared
// CropAndSaveStep (the Gallery tab's crop-on-pick path uses it too), so these
// walk through it rather than around it. The crop editor and the image helpers
// are jsdom-hostile (canvas / react-easy-crop), so both are stubbed; the upload
// mutation runs for real against MSW on a fresh RTK Query store per test.
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
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { GalleryImageResponse } from "@features/gallery/store/galleryApi.gen";

// Fetch the remote URL and crop with jsdom-safe stubs we drive by hand.
const fetchRemoteImage = vi.fn();
const getCroppedBlob = vi.fn();
vi.mock("@utils/imageEditing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@utils/imageEditing")>();
  return {
    ...actual,
    fetchRemoteImage: (url: string) => fetchRemoteImage(url) as Promise<Blob>,
    getCroppedBlob: (...args: unknown[]) => getCroppedBlob(...args) as Promise<Blob>,
  };
});

// Stub the crop editor (one level down, inside CropAndSaveStep): expose its name
// prop and buttons that fire onConfirm / onUseOriginal, so a test can walk
// source → confirm → upload without react-easy-crop/canvas.
vi.mock("./ImageCropEditor", () => ({
  ImageCropEditor: (props: {
    initialName?: string;
    error?: string | null;
    onConfirm: (r: { area: unknown; name: string; altText: string }) => void;
    onCancel: () => void;
    onUseOriginal?: (r: { name: string; altText: string }) => void;
  }) => (
    <div data-testid='crop-editor'>
      <span>{props.initialName}</span>
      {props.error && <span data-testid='crop-error'>{props.error}</span>}
      <button
        onClick={() =>
          props.onConfirm({
            area: { x: 5, y: 6, width: 10, height: 10 },
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

import { UploadTab } from "./UploadTab";
import type { ResolvedCropConfig } from "./cropConfig";

const uploaded: GalleryImageResponse = {
  id: "gi-new",
  galleryId: "g1",
  image: { external: false, srcKey: "gallery/new/original", variants: {} },
  name: "Cropped",
  creatorUserId: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

/** What the deck route returns for a placement-only crop. */
const deckImage = {
  external: false,
  srcKey: "deck/d1/abc/original",
  variants: {},
};

let uploadRequests = 0;
let deckUploads = 0;
const server = setupServer(
  http.post(`${apiBaseUrl}/api/galleries/g1/images/upload`, () => {
    uploadRequests += 1;
    return HttpResponse.json(uploaded, { status: 201 });
  }),
  http.post(`${apiBaseUrl}/api/decks/d1/images/upload`, () => {
    deckUploads += 1;
    return HttpResponse.json(deckImage, { status: 201 });
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterAll(() => {
  server.close();
});
beforeEach(() => {
  // jsdom implements neither; UploadTab frees blob URLs on source change/unmount.
  globalThis.URL.createObjectURL = vi.fn(() => "blob:mock");
  globalThis.URL.revokeObjectURL = vi.fn();
  fetchRemoteImage.mockResolvedValue(new Blob(["img"], { type: "image/png" }));
  getCroppedBlob.mockResolvedValue(new Blob(["cropped"], { type: "image/webp" }));
});
afterEach(() => {
  server.resetHandlers();
  vi.clearAllMocks();
  uploadRequests = 0;
  deckUploads = 0;
});

const REQUIRED_CROP: ResolvedCropConfig = { mode: "required", aspect: 16 / 9 };

const renderTab = (
  galleryId: string | undefined,
  {
    crop = REQUIRED_CROP,
    deckId,
  }: { crop?: ResolvedCropConfig; deckId?: string } = {},
) => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPicked = vi.fn();
  render(
    <Provider store={store}>
      <UploadTab
        galleryId={galleryId}
        deckId={deckId}
        crop={crop}
        onPicked={onPicked}
      />
    </Provider>,
  );
  return { onPicked };
};

/** Walk the paste-URL path up to the crop editor. */
const loadUrl = async (user: ReturnType<typeof userEvent.setup>) => {
  await user.type(screen.getByLabelText("Image URL"), "https://example.com/cat.png");
  await user.click(screen.getByRole("button", { name: "Load" }));
};

describe("UploadTab", () => {
  it("renders the paste-URL form with Load disabled until a URL is typed", () => {
    renderTab("g1");
    expect(screen.getByLabelText("Image URL")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Load" })).toBeDisabled();
  });

  it("shows a preparing hint while the gallery id is unresolved", () => {
    renderTab(undefined);
    expect(screen.getByText(/Preparing your gallery/)).toBeInTheDocument();
  });

  it("fetches a pasted URL through the proxy and opens the crop editor", async () => {
    const user = userEvent.setup();
    renderTab("g1");

    await user.type(screen.getByLabelText("Image URL"), "  https://example.com/cat.png  ");
    await user.click(screen.getByRole("button", { name: "Load" }));

    // Trimmed before it reaches the SSRF-guarded proxy fetch.
    expect(fetchRemoteImage).toHaveBeenCalledWith("https://example.com/cat.png");
    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
  });

  it("surfaces an error when the remote fetch fails, staying on the form", async () => {
    const user = userEvent.setup();
    // A message-less rejection falls through to the friendly default copy.
    fetchRemoteImage.mockRejectedValueOnce({});
    renderTab("g1");

    await user.type(screen.getByLabelText("Image URL"), "https://example.com/bad.png");
    await user.click(screen.getByRole("button", { name: "Load" }));

    expect(await screen.findByText("Could not load that image URL.")).toBeInTheDocument();
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
  });

  it("uploads the cropped blob and hands the stored image back via onPicked", async () => {
    const user = userEvent.setup();
    const { onPicked } = renderTab("g1");

    await loadUrl(user);
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith(uploaded.image);
    });
    // With no deck to scope the crop to it *is* the gallery entry — one write.
    expect(uploadRequests).toBe(1);
    expect(deckUploads).toBe(0);
  });

  it("offers no skip when the crop is required", async () => {
    const user = userEvent.setup();
    renderTab("g1");

    await loadUrl(user);

    expect(await screen.findByTestId("crop-editor")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "use-original" })).not.toBeInTheDocument();
  });
});

describe("UploadTab with a deck target", () => {
  const withDeck = { deckId: "d1" };

  it("stores the original in the gallery and the crop in the deck", async () => {
    const user = userEvent.setup();
    const { onPicked } = renderTab("g1", withDeck);

    await loadUrl(user);
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledTimes(1);
    });
    // One gallery entry — the uncropped original — and the crop under the deck.
    expect(uploadRequests).toBe(1);
    expect(deckUploads).toBe(1);
    const picked = onPicked.mock.calls[0][0] as { srcKey?: string };
    expect(picked.srcKey).toBe("deck/d1/abc/original");
  });

  it("stamps the crop with the gallery image it was cut from", async () => {
    const user = userEvent.setup();
    const { onPicked } = renderTab("g1", withDeck);

    await loadUrl(user);
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledTimes(1);
    });
    const picked = onPicked.mock.calls[0][0] as {
      metadata?: Record<string, unknown>;
    };
    expect(picked.metadata?.crop).toEqual({
      sourceGalleryId: "g1",
      sourceImageId: "gi-new",
      x: 5,
      y: 6,
      width: 10,
      height: 10,
    });
  });

  it("embeds the gallery original when an optional crop is skipped", async () => {
    const user = userEvent.setup();
    const { onPicked } = renderTab("g1", {
      ...withDeck,
      crop: { mode: "optional", aspect: 16 / 9 },
    });

    await loadUrl(user);
    await user.click(await screen.findByRole("button", { name: "use-original" }));

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith(uploaded.image);
    });
    expect(uploadRequests).toBe(1);
    expect(deckUploads).toBe(0);
  });

});

describe("UploadTab with cropping off", () => {
  it("stores the source as it stands, never showing the crop editor", async () => {
    const user = userEvent.setup();
    const { onPicked } = renderTab("g1", {
      crop: { mode: "off", aspect: 16 / 9 },
    });

    await loadUrl(user);

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith(uploaded.image);
    });
    expect(screen.queryByTestId("crop-editor")).not.toBeInTheDocument();
    expect(uploadRequests).toBe(1);
    expect(getCroppedBlob).not.toHaveBeenCalled();
  });
});
