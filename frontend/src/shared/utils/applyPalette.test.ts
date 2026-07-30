// Pins applyPalette's contract: it writes the 16 --role-* custom properties and
// a data-appearance flag from a spec's palette, drops the role vars but keeps
// the flag for a palette-less spec (the built-in default of that appearance),
// clears both when the spec carries neither, and the React helpers mirror that
// as an inline-style object.
import { describe, it, expect } from "vitest";
import {
  applyPalette,
  appearanceValue,
  clearPalette,
  paletteStyle,
  roleVar,
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

  it("keeps the dark flag but drops the role vars for a palette-less spec", () => {
    const el = document.createElement("div");
    applyPalette(el, { ...spec, appearance: "LIGHT" });
    applyPalette(el, { appearance: "DARK" }); // no palette → built-in dark

    expect(el.style.getPropertyValue("--role-canvas")).toBe("");
    expect(el.style.getPropertyValue("--role-primary")).toBe("");
    expect(el.dataset.appearance).toBe("dark");
  });

  it("keeps the light flag but drops the role vars for a palette-less spec", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);
    applyPalette(el, { appearance: "LIGHT" }); // no palette → built-in light

    expect(el.style.getPropertyValue("--role-canvas")).toBe("");
    expect(el.dataset.appearance).toBe("light");
  });

  it("clears the flag too for a spec with neither palette nor appearance", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);
    applyPalette(el, {}); // legacy spec → inherit everything

    expect(el.style.getPropertyValue("--role-canvas")).toBe("");
    expect(el.dataset.appearance).toBeUndefined();
  });

  it("clears the flag for a null spec", () => {
    const el = document.createElement("div");
    applyPalette(el, spec);
    applyPalette(el, null);

    expect(el.style.getPropertyValue("--role-foreground")).toBe("");
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
    applyPalette(el, { palette: spec.palette });
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

  it("gives a palette-less spec its appearance but no style object", () => {
    expect(paletteStyle({ appearance: "DARK" })).toBeUndefined();
    expect(appearanceValue({ appearance: "DARK" })).toBe("dark");
    expect(appearanceValue({ appearance: "LIGHT" })).toBe("light");
  });

  it("returns undefined for a spec with nothing to apply", () => {
    expect(paletteStyle(null)).toBeUndefined();
    expect(appearanceValue(null)).toBeUndefined();
    expect(appearanceValue({})).toBeUndefined();
  });
});

describe("roleVar", () => {
  it("maps palette fields to their CSS custom properties", () => {
    expect(roleVar("canvas")).toBe("--role-canvas");
    expect(roleVar("surfaceRaised")).toBe("--role-surface-raised");
    expect(roleVar("accentSecondary")).toBe("--role-accent-secondary");
  });
});
