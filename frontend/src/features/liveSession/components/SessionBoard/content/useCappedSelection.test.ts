// Guards the capped-selection semantics that every answer surface shares, driven
// off the raw maxSelections values (1 single, 0 unlimited, >1 capped).
import { describe, it, expect } from "vitest";
import { act, renderHook } from "@testing-library/react";
import { toggleCapped, isAtCap, useCappedSelection } from "./useCappedSelection";

describe("toggleCapped", () => {
  it("single-select (max 1) replaces the prior choice", () => {
    expect(toggleCapped(["a"], "b", 1)).toEqual(["b"]);
  });

  it("single-select (max 1) deselects when the same id is tapped again", () => {
    expect(toggleCapped(["a"], "a", 1)).toEqual([]);
  });

  it("unlimited (max 0) accumulates every distinct pick", () => {
    expect(toggleCapped(["a"], "b", 0)).toEqual(["a", "b"]);
    expect(toggleCapped(["a", "b"], "c", 0)).toEqual(["a", "b", "c"]);
  });

  it("capped (max >1) adds until full, then blocks further adds", () => {
    expect(toggleCapped(["a"], "b", 2)).toEqual(["a", "b"]);
    // At the cap of 2: adding a third is a no-op (input returned unchanged).
    expect(toggleCapped(["a", "b"], "c", 2)).toEqual(["a", "b"]);
  });

  it("capped (max >1) still allows deselecting an already-chosen id at the cap", () => {
    expect(toggleCapped(["a", "b"], "a", 2)).toEqual(["b"]);
  });

  it("does not mutate the input array", () => {
    const before = ["a"];
    toggleCapped(before, "b", 0);
    expect(before).toEqual(["a"]);
  });
});

describe("isAtCap", () => {
  it("is true only for a full >1 cap", () => {
    expect(isAtCap(["a", "b"], 2)).toBe(true);
    expect(isAtCap(["a"], 2)).toBe(false);
  });

  it("is never at cap for single-select or unlimited", () => {
    expect(isAtCap(["a"], 1)).toBe(false);
    expect(isAtCap(["a", "b", "c"], 0)).toBe(false);
  });
});

describe("useCappedSelection", () => {
  it("clears the selection when the resetKey changes (new round)", () => {
    const { result, rerender } = renderHook(
      ({ key }) => useCappedSelection(0, key),
      { initialProps: { key: "slide-1" } },
    );

    act(() => {
      result.current.toggle("a");
    });
    expect(result.current.selected).toEqual(["a"]);

    rerender({ key: "slide-2" });
    expect(result.current.selected).toEqual([]);
  });

  it("clear() empties the selection", () => {
    const { result } = renderHook(() => useCappedSelection(0, "slide-1"));

    act(() => {
      result.current.toggle("a");
      result.current.toggle("b");
    });
    expect(result.current.selected).toEqual(["a", "b"]);

    act(() => {
      result.current.clear();
    });
    expect(result.current.selected).toEqual([]);
  });
});
