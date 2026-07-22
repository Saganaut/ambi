// Persistence, cap/dedupe, and cross-instance sync semantics of the shared
// recently-used color store, including recovery from corrupt or wrong-shaped
// localStorage entries.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

const STORAGE_KEY = "ambi-recent-colors";

// The store is module-level and hydrates from localStorage at import time, so
// each test pulls a fresh copy via resetModules + dynamic import.
const loadStore = async () => {
  vi.resetModules();
  return import("./useRecentColors");
};

beforeEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("useRecentColors", () => {
  it("adds colors newest first, dedupes repeats, and caps at 8", async () => {
    const { useRecentColors, addRecentColor } = await loadStore();
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      for (let i = 0; i <= 8; i++) addRecentColor(`#00000${i}`);
      addRecentColor("#000004"); // repeat — moves to front, no duplicate
    });

    expect(result.current).toHaveLength(8);
    expect(result.current[0]).toBe("#000004");
    expect(result.current[1]).toBe("#000008");
    expect(result.current.filter((c) => c === "#000004")).toHaveLength(1);
    expect(result.current).not.toContain("#000000"); // evicted by the cap
  });

  it("persists picks across a module reload", async () => {
    const first = await loadStore();
    act(() => {
      first.addRecentColor("#ff0000");
      first.addRecentColor("var(--role-accent)");
    });

    // Fresh module = simulated page reload; the list rehydrates from storage.
    const second = await loadStore();
    const { result } = renderHook(() => second.useRecentColors());
    expect(result.current).toEqual(["var(--role-accent)", "#ff0000"]);
  });

  it("keeps two mounted instances in sync", async () => {
    const { useRecentColors, addRecentColor } = await loadStore();
    const a = renderHook(() => useRecentColors());
    const b = renderHook(() => useRecentColors());

    act(() => {
      addRecentColor("#123456");
    });

    expect(a.result.current).toEqual(["#123456"]);
    expect(b.result.current).toEqual(["#123456"]);
  });

  it("recovers to an empty list from corrupt JSON", async () => {
    window.localStorage.setItem(STORAGE_KEY, "{not json");
    const { useRecentColors } = await loadStore();
    const { result } = renderHook(() => useRecentColors());
    expect(result.current).toEqual([]);
  });

  it("drops non-color and non-string entries from stored data", async () => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(["#ff0000", 42, "bogus", null, "var(--role-accent)"]),
    );
    const { useRecentColors } = await loadStore();
    const { result } = renderHook(() => useRecentColors());
    expect(result.current).toEqual(["#ff0000", "var(--role-accent)"]);
  });

  it("still updates in memory when localStorage writes throw", async () => {
    const { useRecentColors, addRecentColor } = await loadStore();
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    const { result } = renderHook(() => useRecentColors());

    act(() => {
      addRecentColor("#abcdef");
    });

    expect(result.current).toEqual(["#abcdef"]);
  });
});
