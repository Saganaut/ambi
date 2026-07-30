// Pins the deck-theme resolution split: the two reserved default ids resolve
// client-side and must never hit GET /api/themes/{id} (there is no such
// document), while any other id still comes from the cache/network.
import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { renderHook } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import type { ReactNode } from "react";

import { emptySplitApi, apiBaseUrl } from "@/shared/store/emptyApi";
import type { ThemeResponse } from "../store/themeApi.gen";
import { useDeckTheme } from "./useDeckTheme";

const CUSTOM_THEME_ID = "9b1d1e2c-0000-4000-8000-000000000001";

const customTheme: ThemeResponse = {
  id: CUSTOM_THEME_ID,
  name: "Dracula",
  builtIn: false,
  spec: { appearance: "DARK", palette: { canvas: "#282a36", foreground: "#f8f8f2" } },
  permissions: { canView: true, canEdit: true, canManage: true },
};

let fetchedIds: string[] = [];
const server = setupServer(
  http.get(`${apiBaseUrl}/api/themes/:id`, ({ params }) => {
    fetchedIds.push(String(params.id));
    return HttpResponse.json(customTheme);
  }),
);

beforeAll(() => {
  server.listen({ onUnhandledRequest: "error" });
});
afterEach(() => {
  server.resetHandlers();
  fetchedIds = [];
});
afterAll(() => {
  server.close();
});

const makeStore = () =>
  configureStore({
    reducer: { [emptySplitApi.reducerPath]: emptySplitApi.reducer },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware().concat(emptySplitApi.middleware),
  });

const renderUseDeckTheme = (themeId?: string) => {
  const store = makeStore();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );
  return renderHook(() => useDeckTheme(themeId), { wrapper }).result;
};

const flush = () => new Promise((resolve) => setTimeout(resolve, 50));

describe("useDeckTheme", () => {
  it("resolves a default theme id locally, without fetching", async () => {
    const result = renderUseDeckTheme("ambi-dark");
    await flush();

    expect(result.current.theme?.name).toBe("Ambi Dark");
    expect(result.current.appearance).toBe("dark");
    // No palette to write inline — tokens.css paints the dark block instead.
    expect(result.current.style).toBeUndefined();
    expect(fetchedIds).toEqual([]);
  });

  it("still fetches a stored theme", async () => {
    const result = renderUseDeckTheme(CUSTOM_THEME_ID);
    await vi.waitFor(() => {
      expect(result.current.theme?.name).toBe("Dracula");
    });

    expect(fetchedIds).toEqual([CUSTOM_THEME_ID]);
    expect(result.current.appearance).toBe("dark");
    expect(result.current.style).toEqual({
      "--role-canvas": "#282a36",
      "--role-foreground": "#f8f8f2",
    });
  });

  it("resolves nothing — and fetches nothing — without a theme id", async () => {
    const result = renderUseDeckTheme(undefined);
    await flush();

    expect(result.current.theme).toBeUndefined();
    expect(result.current.spec).toBeUndefined();
    expect(result.current.style).toBeUndefined();
    expect(result.current.appearance).toBeUndefined();
    expect(fetchedIds).toEqual([]);
  });
});
