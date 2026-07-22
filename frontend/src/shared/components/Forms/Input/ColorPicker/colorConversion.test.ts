import { describe, expect, it } from "vitest";
import {
  hexToHsva,
  hsvaToHex,
  hsvToRgb,
  hueToPureHex,
  isColorValue,
  oklchToHsva,
  parseColor,
  rgbToHsv,
  type Hsva,
} from "./colorConversion";

/** Unwrap a nullable parse result, failing the test when parsing failed. */
const mustParse = (parsed: Hsva | null, source: string): Hsva => {
  if (parsed === null) throw new Error(`Expected ${source} to parse`);
  return parsed;
};

/** Absolute per-channel distance between two #rrggbb strings. */
const hexDistance = (a: string, b: string) => {
  const chan = (hex: string, i: number) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16);
  return Math.max(
    Math.abs(chan(a, 0) - chan(b, 0)),
    Math.abs(chan(a, 1) - chan(b, 1)),
    Math.abs(chan(a, 2) - chan(b, 2)),
  );
};

describe("rgb ↔ hsv", () => {
  it("round-trips primary and mixed colors", () => {
    const cases: [number, number, number][] = [
      [255, 0, 0],
      [0, 255, 0],
      [0, 0, 255],
      [255, 255, 255],
      [0, 0, 0],
      [49, 130, 206],
      [128, 64, 200],
    ];
    for (const [r, g, b] of cases) {
      const { h, s, v } = rgbToHsv(r, g, b);
      expect(hsvToRgb(h, s, v)).toEqual([r, g, b]);
    }
  });
});

describe("hexToHsva / hsvaToHex", () => {
  it("parses 6-digit hex and round-trips", () => {
    const hsva = mustParse(hexToHsva("#3182CE"), "#3182CE");
    expect(hsva.a).toBe(1);
    expect(hsvaToHex(hsva)).toBe("#3182ce");
  });

  it("expands shorthand hex", () => {
    expect(hsvaToHex(mustParse(hexToHsva("#f00"), "#f00"))).toBe("#ff0000");
  });

  it("carries alpha through 8-digit hex", () => {
    const hsva = mustParse(hexToHsva("#3182ce80"), "#3182ce80");
    expect(hsva.a).toBeCloseTo(0.5, 1);
    expect(hsvaToHex(hsva)).toBe("#3182ce80");
  });

  it("drops the alpha byte when opaque", () => {
    expect(hsvaToHex({ h: 210, s: 50, v: 50, a: 1 })).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("rejects malformed input", () => {
    expect(hexToHsva("#12345")).toBeNull();
    expect(hexToHsva("3182ce")).toBeNull();
    expect(hexToHsva("#gggggg")).toBeNull();
  });
});

describe("oklchToHsva", () => {
  it("converts pure red", () => {
    const source = "oklch(0.627955 0.257683 29.2339)";
    const hsva = mustParse(oklchToHsva(source), source);
    expect(hexDistance(hsvaToHex(hsva), "#ff0000")).toBeLessThanOrEqual(2);
  });

  it("converts white and black", () => {
    const white = mustParse(oklchToHsva("oklch(1 0 0)"), "oklch(1 0 0)");
    const black = mustParse(oklchToHsva("oklch(0 0 0)"), "oklch(0 0 0)");
    expect(hexDistance(hsvaToHex(white), "#ffffff")).toBe(0);
    expect(hexDistance(hsvaToHex(black), "#000000")).toBe(0);
  });

  it("accepts percentage lightness and alpha", () => {
    const source = "oklch(62.7955% 0.257683 29.2339 / 50%)";
    expect(mustParse(oklchToHsva(source), source).a).toBeCloseTo(0.5, 5);
  });

  it("rejects malformed input", () => {
    expect(oklchToHsva("oklch()")).toBeNull();
    expect(oklchToHsva("#ff0000")).toBeNull();
  });
});

describe("isColorValue", () => {
  it("accepts hex, oklch, and theme var() strings", () => {
    expect(isColorValue("#3182ce")).toBe(true);
    expect(isColorValue("oklch(0.65 0.18 260)")).toBe(true);
    expect(isColorValue("var(--role-accent)")).toBe(true);
  });

  it("rejects non-strings and non-color strings", () => {
    expect(isColorValue(42)).toBe(false);
    expect(isColorValue(null)).toBe(false);
    expect(isColorValue(undefined)).toBe(false);
    expect(isColorValue("red")).toBe(false);
    expect(isColorValue("")).toBe(false);
  });
});

describe("parseColor", () => {
  it("dispatches on format", () => {
    expect(parseColor("#3182ce")).not.toBeNull();
    expect(parseColor("oklch(0.65 0.18 260)")).not.toBeNull();
    expect(parseColor("rgb(49, 130, 206)")).not.toBeNull();
    const withAlpha = "rgb(49 130 206 / 0.5)";
    expect(mustParse(parseColor(withAlpha), withAlpha).a).toBeCloseTo(0.5, 5);
    expect(parseColor("var(--role-accent)")).toBeNull();
    expect(parseColor("not-a-color")).toBeNull();
  });
});

describe("hueToPureHex", () => {
  it("returns the fully saturated hue", () => {
    expect(hueToPureHex(0)).toBe("#ff0000");
    expect(hueToPureHex(120)).toBe("#00ff00");
    expect(hueToPureHex(240)).toBe("#0000ff");
  });
});
