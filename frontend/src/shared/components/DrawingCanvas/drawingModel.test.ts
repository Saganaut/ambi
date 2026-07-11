// Unit tests for the pure drawing geometry — the hit-testing that powers the
// whole-element eraser. Rendering (perfect-freehand outlines, canvas 2D) is
// covered visually via Storybook; these pin down the math that's easy to get
// subtly wrong.
import { describe, expect, it } from "vitest";
import {
  hitTestElement,
  type DrawingPoint,
  type PenElement,
  type ShapeElement,
} from "./drawingModel";

const point = (x: number, y: number): DrawingPoint => ({ x, y, pressure: 0.5 });

const pen = (points: [number, number][], size = 10): PenElement => ({
  kind: "pen",
  color: "#000000",
  size,
  points: points.map(([x, y]) => point(x, y)),
});

const shape = (
  kind: ShapeElement["kind"],
  start: [number, number],
  end: [number, number],
  size = 4,
): ShapeElement => ({
  kind,
  color: "#000000",
  size,
  start: point(...start),
  end: point(...end),
});

describe("hitTestElement", () => {
  describe("pen strokes", () => {
    it("hits anywhere along a segment, not just at stored points", () => {
      const stroke = pen([
        [0, 0],
        [100, 0],
      ]);
      expect(hitTestElement(stroke, point(50, 0), 5)).toBe(true);
      expect(hitTestElement(stroke, point(50, 8), 5)).toBe(true); // radius 5 + size/2 5
    });

    it("misses beyond the eraser reach", () => {
      const stroke = pen([
        [0, 0],
        [100, 0],
      ]);
      expect(hitTestElement(stroke, point(50, 20), 5)).toBe(false);
    });

    it("hits a single-point dot", () => {
      const dot = pen([[40, 40]]);
      expect(hitTestElement(dot, point(45, 40), 5)).toBe(true);
      expect(hitTestElement(dot, point(60, 40), 5)).toBe(false);
    });
  });

  describe("lines", () => {
    it("hits near the segment and misses past its ends", () => {
      const line = shape("line", [0, 0], [100, 100]);
      expect(hitTestElement(line, point(50, 50), 5)).toBe(true);
      expect(hitTestElement(line, point(120, 120), 5)).toBe(false);
    });
  });

  describe("rectangles", () => {
    it("hits the outline but not the hollow interior", () => {
      const rect = shape("rect", [0, 0], [100, 100]);
      expect(hitTestElement(rect, point(0, 50), 5)).toBe(true); // left edge
      expect(hitTestElement(rect, point(50, 100), 5)).toBe(true); // bottom edge
      expect(hitTestElement(rect, point(50, 50), 5)).toBe(false); // center
    });

    it("normalizes an inverted drag (end above/left of start)", () => {
      const rect = shape("rect", [100, 100], [0, 0]);
      expect(hitTestElement(rect, point(0, 50), 5)).toBe(true);
    });
  });

  describe("ellipses", () => {
    it("hits the outline but not the hollow interior", () => {
      const ellipse = shape("ellipse", [0, 0], [100, 100]); // circle r=50 at (50,50)
      expect(hitTestElement(ellipse, point(50, 0), 5)).toBe(true); // top of ring
      expect(hitTestElement(ellipse, point(50, 50), 5)).toBe(false); // center
    });

    it("treats a zero-size ellipse as a point", () => {
      const dot = shape("ellipse", [30, 30], [30, 30]);
      expect(hitTestElement(dot, point(32, 30), 5)).toBe(true);
      expect(hitTestElement(dot, point(45, 30), 5)).toBe(false);
    });
  });
});
