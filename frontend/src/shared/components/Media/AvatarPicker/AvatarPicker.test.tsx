// Behavioural tests for the avatar picker modal body: all three source tabs
// render, a built-in tile pick yields a `{ kind: "builtin" }` union member,
// and a gallery tile pick yields `{ kind: "image" }` with the stored AppImage.
// The gallery endpoints are served by MSW against a fresh RTK Query store per
// test (the picker itself is store-backed via useGetMyGalleryQuery).
import { describe, it, expect, vi, beforeAll, afterAll, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import { authPromptReducer } from "@/features/auth/store/authPromptSlice";
import type {
  GalleryResponse,
  PagedModelGalleryImageResponse,
} from "@features/gallery/store/galleryApi.gen";
import { AvatarPicker } from "./AvatarPicker";

const gallery: GalleryResponse = {
  id: "g1",
  name: "My gallery",
  ownership: { type: "USER", ownerId: "u1" },
  creatorUserId: "u1",
  version: 1,
  imageCount: 1,
  createdAt: "2026-01-01T00:00:00Z",
  updatedAt: "2026-01-01T00:00:00Z",
  permissions: { canView: true, canEdit: true, canManage: true },
};

const storedImage = {
  external: false,
  srcKey: "gallery/abc/original",
  variants: { SM: "https://s3.example/sm" },
};

const imagePage: PagedModelGalleryImageResponse = {
  content: [
    {
      id: "gi1",
      galleryId: "g1",
      image: storedImage,
      name: "Shire sunrise",
      creatorUserId: "u1",
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    },
  ],
  page: { size: 100, number: 0, totalElements: 1, totalPages: 1 },
};

const server = setupServer(
  http.get(`${apiBaseUrl}/api/galleries/mine`, () => HttpResponse.json(gallery)),
  http.get(`${apiBaseUrl}/api/galleries/g1/images`, () =>
    HttpResponse.json(imagePage),
  ),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

const renderPicker = (builtinValue?: string) => {
  // Fresh store per test so RTK Query caches can't leak between cases.
  const store = configureStore({
    reducer: {
      [emptySplitApi.reducerPath]: emptySplitApi.reducer,
      authPrompt: authPromptReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });
  const onPick = vi.fn();
  const onClose = vi.fn();
  render(
    <Provider store={store}>
      <AvatarPicker
        builtinValue={builtinValue}
        onPick={onPick}
        onClose={onClose}
      />
    </Provider>,
  );
  return { onPick, onClose };
};

describe("AvatarPicker", () => {
  it("renders the three source tabs", () => {
    renderPicker();
    expect(screen.getByRole("tab", { name: "Built-in" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Gallery" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Upload" })).toBeInTheDocument();
  });

  it("yields a builtin pick from the Built-in tab", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    // The selector renders radios named after each avatar; pick the first.
    const tiles = screen.getAllByRole("radio");
    await user.click(tiles[0]);

    expect(onPick).toHaveBeenCalledWith({
      kind: "builtin",
      internalAvatarId: expect.stringMatching(/^avatar-/) as string,
    });
  });

  it("yields an image pick from the Gallery tab", async () => {
    const user = userEvent.setup();
    const { onPick } = renderPicker();

    await user.click(screen.getByRole("tab", { name: "Gallery" }));
    await user.click(await screen.findByText("Shire sunrise"));

    expect(onPick).toHaveBeenCalledWith({
      kind: "image",
      image: storedImage,
    });
  });

  it("wires the Close button to onClose", async () => {
    const user = userEvent.setup();
    const { onClose } = renderPicker();

    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });
});
