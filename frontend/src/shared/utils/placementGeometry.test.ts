// Covers the shared placement conversions: pointer → normalized point in both
// surface orientations, clamping to the box, the degenerate-rect guard, and the
// round trip back to render percentages.
import { describe, expect, it } from "vitest";

import { clamp01, clampPoint, normalizeToBox, toRenderStyle } from "./placementGeometry";

/** A 200 × 100 surface at (50, 20) — deliberately non-square so y is testable. */
const rect = (): DOMRect =>
  ({ left: 50, top: 20, width: 200, height: 100 }) as unknown as DOMRect;

describe("clamp01", () => {
  it("holds a coordinate inside the normalized range", () => {
    expect(clamp01(0.4)).toBe(0.4);
    expect(clamp01(-2)).toBe(0);
    expect(clamp01(7)).toBe(1);
  });
});

describe("clampPoint", () => {
  it("pulls both coordinates back into the normalized space", () => {
    expect(clampPoint({ x: -0.5, y: 1.5 })).toEqual({ x: 0, y: 1 });
  });

  it("leaves an in-range point untouched", () => {
    expect(clampPoint({ x: 0.25, y: 0.75 })).toEqual({ x: 0.25, y: 0.75 });
  });

  it("carries the rest of the point's fields through", () => {
    expect(clampPoint({ id: "target-1", x: 2, y: 0.5, radius: 0.1 })).toEqual({
      id: "target-1",
      x: 1,
      y: 0.5,
      radius: 0.1,
    });
  });
});

describe("normalizeToBox", () => {
  it("measures from the top-left when the surface is not inverted", () => {
    expect(normalizeToBox(rect(), 100, 45, false)).toEqual({ x: 0.25, y: 0.25 });
  });

  it("measures from the bottom-left when the surface is inverted", () => {
    expect(normalizeToBox(rect(), 100, 45, true)).toEqual({ x: 0.25, y: 0.75 });
  });

  it("puts the two orientations' y on opposite sides of the box", () => {
    expect(normalizeToBox(rect(), 150, 100, false)).toEqual({ x: 0.5, y: 0.8 });
    const fromBottom = normalizeToBox(rect(), 150, 100, true);
    expect(fromBottom?.x).toBe(0.5);
    expect(fromBottom?.y).toBeCloseTo(0.2);
  });

  it("clamps a pointer that has left the surface", () => {
    expect(normalizeToBox(rect(), -500, 500, false)).toEqual({ x: 0, y: 1 });
    expect(normalizeToBox(rect(), 500, -500, true)).toEqual({ x: 1, y: 1 });
    expect(normalizeToBox(rect(), 500, 500, true)).toEqual({ x: 1, y: 0 });
  });

  it("returns null for a missing or zero-sized surface", () => {
    expect(normalizeToBox(undefined, 100, 45, false)).toBeNull();
    expect(
      normalizeToBox({ left: 0, top: 0, width: 0, height: 100 } as unknown as DOMRect, 0, 0, false),
    ).toBeNull();
    expect(
      normalizeToBox({ left: 0, top: 0, width: 200, height: 0 } as unknown as DOMRect, 0, 0, true),
    ).toBeNull();
  });
});

describe("toRenderStyle", () => {
  it("renders a normalized point as percentage offsets", () => {
    expect(toRenderStyle({ x: 0.25, y: 0.75 }, false)).toEqual({ left: "25%", top: "75%" });
  });

  it("flips an inverted surface's point back to screen space", () => {
    expect(toRenderStyle({ x: 0.25, y: 0.75 }, true)).toEqual({ left: "25%", top: "25%" });
  });

  it("puts the origin at the box's own corner for each orientation", () => {
    expect(toRenderStyle({ x: 0, y: 0 }, false)).toEqual({ left: "0%", top: "0%" });
    expect(toRenderStyle({ x: 0, y: 0 }, true)).toEqual({ left: "0%", top: "100%" });
  });

  it("round-trips a pointer position back to where it was pressed", () => {
    for (const invertY of [false, true]) {
      const point = normalizeToBox(rect(), 100, 45, invertY);
      expect(point).not.toBeNull();
      expect(toRenderStyle(point as { x: number; y: number }, invertY)).toEqual({
        left: "25%",
        top: "25%",
      });
    }
  });
});
