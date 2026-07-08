// Pins the track↔scale-unit mapping the continuous Scales editor (and board)
// grades through: clamping to the normalized track, denormalization round
// trips, degenerate spans, and the readout formatting rules.
import { describe, expect, it } from "vitest";

import { clamp01, formatScaleValue, positionToValue, valueToPosition } from "./scaleValue";

describe("clamp01", () => {
  it("passes through in-range values and clamps overshoot", () => {
    expect(clamp01(0.25)).toBe(0.25);
    expect(clamp01(-0.5)).toBe(0);
    expect(clamp01(1.5)).toBe(1);
  });
});

describe("positionToValue", () => {
  it("maps the track ends and midpoint into scale units", () => {
    expect(positionToValue(0, 1, 5)).toBe(1);
    expect(positionToValue(1, 1, 5)).toBe(5);
    expect(positionToValue(0.5, 1, 5)).toBe(3);
  });

  it("clamps an off-track position before mapping", () => {
    expect(positionToValue(-0.2, 1, 5)).toBe(1);
    expect(positionToValue(1.2, 1, 5)).toBe(5);
  });

  it("handles negative-valued scales", () => {
    expect(positionToValue(0.5, -10, 10)).toBe(0);
  });
});

describe("valueToPosition", () => {
  it("round-trips with positionToValue", () => {
    expect(valueToPosition(positionToValue(0.3, 1, 5), 1, 5)).toBeCloseTo(0.3);
  });

  it("clamps out-of-range values onto the track", () => {
    expect(valueToPosition(0, 1, 5)).toBe(0);
    expect(valueToPosition(9, 1, 5)).toBe(1);
  });

  it("maps a degenerate span to the left end instead of dividing by zero", () => {
    expect(valueToPosition(3, 5, 5)).toBe(0);
    expect(valueToPosition(3, 5, 1)).toBe(0);
  });
});

describe("formatScaleValue", () => {
  it("renders integers bare", () => {
    expect(formatScaleValue(4)).toBe("4");
    expect(formatScaleValue(4.0)).toBe("4");
  });

  it("trims trailing zeros after rounding to 2 decimals", () => {
    expect(formatScaleValue(4.5)).toBe("4.5");
    expect(formatScaleValue(4.503)).toBe("4.5");
    expect(formatScaleValue(4.567)).toBe("4.57");
  });

  it("normalizes a rounded-away negative to plain zero", () => {
    expect(formatScaleValue(-0.001)).toBe("0");
  });
});
