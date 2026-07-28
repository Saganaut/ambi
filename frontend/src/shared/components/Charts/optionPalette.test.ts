// Pins paletteColorAt's contract: the first cycle returns the six swatches
// as-is, later cycles alternate between the original lightness and a darker
// relative-color re-derivation, resolveDatumColor lets an authored override win
// over the palette default, and nextPaletteColor — what the placement editors
// stamp on an item they create — hands out the lowest slot still free.
import { describe, it, expect } from "vitest";
import {
  buildOptionPalette,
  nextPaletteColor,
  paletteColorAt,
  resolveDatumColor,
} from "./optionPalette";

describe("paletteColorAt", () => {
  const palette = buildOptionPalette();

  it("returns the six swatches as-is for indices 0-5", () => {
    for (let i = 0; i < palette.length; i += 1) {
      expect(paletteColorAt(i)).toBe(palette[i]);
    }
  });

  it("re-derives the hue at a darker lightness for the second cycle", () => {
    expect(paletteColorAt(6)).toBe(`oklch(from ${palette[0]} 0.42 c h)`);
    expect(paletteColorAt(7)).toBe(`oklch(from ${palette[1]} 0.42 c h)`);
  });

  it("alternates back to the original lightness for the third cycle (index 12)", () => {
    expect(paletteColorAt(12)).toBe(palette[0]);
  });

  it("treats a negative index as 0", () => {
    expect(paletteColorAt(-1)).toBe(palette[0]);
  });
});

describe("resolveDatumColor", () => {
  it("prefers the datum's own color over the palette default", () => {
    expect(resolveDatumColor("#123456", 3)).toBe("#123456");
  });

  it("falls back to the palette default when no override is set", () => {
    const palette = buildOptionPalette();
    expect(resolveDatumColor(undefined, 2)).toBe(palette[2]);
  });
});

describe("nextPaletteColor", () => {
  const palette = buildOptionPalette();

  it("starts at the first slot when nothing is in use", () => {
    expect(nextPaletteColor([])).toBe(palette[0]);
  });

  it("returns the lowest slot none of the used colors occupies", () => {
    expect(nextPaletteColor([palette[0], palette[1]])).toBe(palette[2]);
    // A gap is reclaimed: removing the middle item frees its slot again.
    expect(nextPaletteColor([palette[0], palette[2]])).toBe(palette[1]);
  });

  it("ignores absent colors and custom ones, which occupy no slot", () => {
    expect(nextPaletteColor([palette[0], undefined, "#ff8800"])).toBe(palette[1]);
  });

  it("continues into the darker cycle once the six swatches are taken", () => {
    expect(nextPaletteColor(palette)).toBe(paletteColorAt(6));
  });
});
