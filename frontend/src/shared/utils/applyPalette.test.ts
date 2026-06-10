// Pins applyPalette's contract: it writes the 16 --role-* custom properties and
// a data-appearance flag from a spec's palette, clears them for a palette-less
// (legacy/null) spec so the element falls back to the brand defaults, and the
// React helpers mirror that as an inline-style object.
import { describe, it, expect } from "vitest";
import {
  applyPalette,
  appearanceValue,
  clearPalette,
  paletteStyle,
} from "./applyPalette";
import type { ThemeSpec } from "@features/theme/store/themeApi.gen";

const spec: ThemeSpec = {
  appearance: "DARK",
  palette: {
    canvas: "#1e1e2e",
    surface: "#313244",
    surfaceRaised: "#45475a",
    subtle: "#181825",
    foreground: "#cdd6f4",
    mutedForeground: "#a6adc8",
    primary: "#cba6f7",
    onPrimary: "#1e1e2e",
    accent: "#f5c2e7",
    accentSecondary: "#89b4fa",
    border: "#45475a",
    borderSubtle: "#313244",
    red: "#f38ba8",
    green: "#a6e3a1",
    yellow: "#f9e2af",
    blue: "#89b4fa",
  },
};

describe("applyPalette", () => {
  it("writes role vars + appearance onto the element", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);

    expect(el.style.getPropertyValue("--role-canvas")).toBe("#1e1e2e");
    expect(el.style.getPropertyValue("--role-surface-raised")).toBe("#45475a");
    expect(el.style.getPropertyValue("--role-muted-foreground")).toBe("#a6adc8");
    expect(el.style.getPropertyValue("--role-blue")).toBe("#89b4fa");
    expect(el.dataset.appearance).toBe("dark");
  });

  it("clears role vars for a palette-less (legacy) spec", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);
    applyPalette(el, { appearance: "LIGHT" }); // no palette → revert

    expect(el.style.getPropertyValue("--role-canvas")).toBe("");
    expect(el.dataset.appearance).toBeUndefined();
  });

  it("clearPalette removes every role var and the flag", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);
    clearPalette(el);

    expect(el.style.getPropertyValue("--role-primary")).toBe("");
    expect(el.dataset.appearance).toBeUndefined();
  });

  it("light appearance is the default flag for a palette spec", () => {
    const el = document.createElement("div");
    applyPalette(el, { ...spec, appearance: "LIGHT" });
    expect(el.dataset.appearance).toBe("light");
  });
});

describe("paletteStyle / appearanceValue", () => {
  it("returns role vars as a style object and the matching appearance", () => {
    const style = paletteStyle(spec) as Record<string, string>;
    expect(style["--role-canvas"]).toBe("#1e1e2e");
    expect(style["--role-accent-secondary"]).toBe("#89b4fa");
    expect(appearanceValue(spec)).toBe("dark");
  });

  it("returns undefined for a palette-less spec", () => {
    expect(paletteStyle({ appearance: "DARK" })).toBeUndefined();
    expect(appearanceValue({ appearance: "DARK" })).toBeUndefined();
    expect(paletteStyle(null)).toBeUndefined();
  });
});
