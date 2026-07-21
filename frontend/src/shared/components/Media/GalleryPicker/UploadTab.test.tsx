// Behavioural tests for the Upload tab. Two source paths converge on one flow —
// a blob URL → crop → multipart upload — so a pasted web URL is stored as owned
// bytes (fetched through the SSRF-guarded backend proxy) rather than kept as a
// fragile external reference. The crop editor and the image helpers are jsdom-
// hostile (canvas / react-easy-crop), so both are stubbed; the upload mutation
// runs for real against MSW on a fresh RTK Query store per test.
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
vi.mock("@utils/imageEditing", () => ({
  fetchRemoteImage: (url: string) => fetchRemoteImage(url) as Promise<Blob>,
  getCroppedBlob: (...args: unknown[]) => getCroppedBlob(...args) as Promise<Blob>,
}));

// Stub the crop editor: expose its name prop and a button that fires onConfirm,
// so a test can walk source → confirm → upload without react-easy-crop/canvas.
vi.mock("./ImageCropEditor", () => ({
  ImageCropEditor: (props: {
    initialName?: string;
    error?: string | null;
    onConfirm: (r: { area: unknown; name: string; altText: string }) => void;
    onCancel: () => void;
  }) => (
    <div data-testid='crop-editor'>
      <span>{props.initialName}</span>
      {props.error && <span data-testid='crop-error'>{props.error}</span>}
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

import { UploadTab } from "./UploadTab";

const uploaded: GalleryImageResponse = {
  id: "gi-new",
  galleryId: "g1",
  image: { external: false, srcKey: "gallery/new/original", variants: {} },
  name: "Cropped",
  creatorUserId: "u1",
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
};

let uploadRequests = 0;
const server = setupServer(
  http.post(`${apiBaseUrl}/api/galleries/g1/images/upload`, () => {
    uploadRequests += 1;
    return HttpResponse.json(uploaded, { status: 201 });
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
});

const renderTab = (galleryId: string | undefined) => {
  const store = configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPicked = vi.fn();
  render(
    <Provider store={store}>
      <UploadTab galleryId={galleryId} aspect={16 / 9} onPicked={onPicked} />
    </Provider>,
  );
  return { onPicked };
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

    await user.type(screen.getByLabelText("Image URL"), "https://example.com/cat.png");
    await user.click(screen.getByRole("button", { name: "Load" }));
    await user.click(await screen.findByRole("button", { name: "confirm-crop" }));

    await vi.waitFor(() => {
      expect(onPicked).toHaveBeenCalledWith(uploaded.image);
    });
    expect(uploadRequests).toBe(1);
  });
});
