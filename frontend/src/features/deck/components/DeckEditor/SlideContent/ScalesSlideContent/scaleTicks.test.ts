import { describe, expect, it } from "vitest";

import { MAX_TRACK_TICKS, scaleTicks } from "./scaleTicks";

describe("scaleTicks", () => {
  it("renders one tick per step for a plain integer range", () => {
    expect(scaleTicks(1, 5, 1)).toEqual([1, 2, 3, 4, 5]);
  });

  it("supports fractional steps", () => {
    expect(scaleTicks(1, 3, 0.5)).toEqual([1, 1.5, 2, 2.5, 3]);
  });

  it("absorbs float drift so the last tick lands on max", () => {
    const ticks = scaleTicks(0, 1, 0.1);
    expect(ticks).toHaveLength(11);
    expect(ticks.at(-1)).toBe(1);
  });

  it("bails out when the step does not land exactly on max", () => {
    // 1 + 3·1.5 = 5.5 ≠ 5 — max would be unselectable on a dot track.
    expect(scaleTicks(1, 5, 1.5)).toEqual([]);
  });

  it("bails out on degenerate ranges", () => {
    expect(scaleTicks(5, 5, 1)).toEqual([]);
    expect(scaleTicks(5, 1, 1)).toEqual([]);
    expect(scaleTicks(1, 5, 0)).toEqual([]);
    expect(scaleTicks(1, 5, -1)).toEqual([]);
  });

  it("bails out when the step overshoots the whole range", () => {
    expect(scaleTicks(1, 5, 10)).toEqual([]);
  });

  it("bails out beyond the tappable-density cap", () => {
    expect(scaleTicks(0, MAX_TRACK_TICKS, 1)).toEqual([]);
    expect(scaleTicks(0, MAX_TRACK_TICKS - 1, 1)).toHaveLength(MAX_TRACK_TICKS);
  });
});
