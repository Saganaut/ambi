// Pins the client-side default themes: reserved ids that decks and preferences
// persist, palette-less specs (their colours are tokens.css, not stored data),
// and the spec → default-theme-id round trip the account page marks "active" by.
import { describe, expect, it } from "vitest";
import {
  DEFAULT_THEMES,
  DEFAULT_THEME_IDS,
  defaultThemeById,
  defaultThemeIdForSpec,
  isDefaultThemeId,
  isDefaultThemeName,
} from "./defaultThemes";

describe("defaultThemes", () => {
  it("reserves stable ids that persisted decks and preferences can refer to", () => {
    expect(DEFAULT_THEME_IDS).toEqual(["ambi-light", "ambi-dark"]);
    expect(DEFAULT_THEMES.map((theme) => theme.id)).toEqual([...DEFAULT_THEME_IDS]);
    expect(DEFAULT_THEMES.map((theme) => theme.name)).toEqual([
      "Ambi Light",
      "Ambi Dark",
    ]);
  });

  it("carries an appearance and no palette, so tokens.css paints them", () => {
    expect(defaultThemeById("ambi-light")?.spec).toEqual({ appearance: "LIGHT" });
    expect(defaultThemeById("ambi-dark")?.spec).toEqual({ appearance: "DARK" });
  });

  it("presents every default as a view-only built-in", () => {
    for (const theme of DEFAULT_THEMES) {
      expect(theme.builtIn).toBe(true);
      expect(theme.permissions).toEqual({
        canView: true,
        canEdit: false,
        canManage: false,
      });
    }
  });

  it("recognises only the reserved ids", () => {
    expect(isDefaultThemeId("ambi-dark")).toBe(true);
    expect(isDefaultThemeId("f2a4b3c1-0000-4000-8000-000000000000")).toBe(false);
    expect(isDefaultThemeId(undefined)).toBe(false);
    expect(defaultThemeById("nope")).toBeUndefined();
  });

  it("matches the superseded seeded presets by name", () => {
    expect(isDefaultThemeName("Ambi Light")).toBe(true);
    expect(isDefaultThemeName("Dracula")).toBe(false);
    expect(isDefaultThemeName(undefined)).toBe(false);
  });

  it("round-trips a default's own spec back to its id", () => {
    for (const theme of DEFAULT_THEMES) {
      expect(defaultThemeIdForSpec(theme.spec)).toBe(theme.id);
    }
  });

  it("claims no spec that a default could not have produced", () => {
    expect(defaultThemeIdForSpec({ appearance: "DARK", palette: { canvas: "#000000" } })).toBeUndefined();
    expect(defaultThemeIdForSpec({ palette: { canvas: "#ffffff" } })).toBeUndefined();
    expect(
      defaultThemeIdForSpec({ appearance: "LIGHT", logoImage: { external: false } }),
    ).toBeUndefined();
    // No appearance at all is "no preference", not a choice of Ambi Light.
    expect(defaultThemeIdForSpec({})).toBeUndefined();
    expect(defaultThemeIdForSpec(null)).toBeUndefined();
    expect(defaultThemeIdForSpec(undefined)).toBeUndefined();
  });
});
