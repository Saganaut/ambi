// Pins the background quick-picks a theme offers: a stored palette's surface
// roles pass through in order as 6-digit hex (the only format the background
// field is validated to), anything else is skipped, duplicates collapse, and a
// spec with no usable stored surfaces falls back to reading the live cascade
// off a throwaway probe.
//
// The cascade path is exercised against a stubbed getComputedStyle: jsdom
// neither resolves `var(--role-*)` nor returns a live declaration, so the real
// one can only show that the fallback degrades quietly (last test).
import { describe, it, expect, afterEach, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import type { Palette, ThemeSpec } from "../store/themeApi.gen";
import { useBackgroundSwatches } from "./useBackgroundSwatches";

const palette = (surfaces: Partial<Palette>): Palette => ({
  foreground: "#111111",
  primary: "#2266ee",
  ...surfaces,
});

/**
 * Replaces getComputedStyle with a live view of the probe's inline colour,
 * resolving `var(--role-*)` from `resolved` — which is what a browser does and
 * jsdom does not. Returns the elements the hook measured.
 */
const stubCascade = (resolved: Record<string, string>): HTMLElement[] => {
  const probes: HTMLElement[] = [];
  vi.spyOn(window, "getComputedStyle").mockImplementation(((element: Element) => {
    const probe = element as HTMLElement;
    probes.push(probe);
    return {
      get color() {
        const varRef = /^var\((--[a-z-]+)\)$/.exec(probe.style.color);
        return varRef ? (resolved[varRef[1]] ?? "") : probe.style.color;
      },
    } as CSSStyleDeclaration;
  }) as typeof window.getComputedStyle);
  return probes;
};

// canvas and surface land on the same colour (deduped), surfaceRaised carries
// alpha (pinned opaque), subtle resolves to nothing (skipped).
const CASCADE = {
  "--role-canvas": "rgb(255, 255, 255)",
  "--role-surface": "rgb(255, 255, 255)",
  "--role-surface-raised": "rgba(18, 52, 86, 0.5)",
};

const swatchesFor = (spec?: ThemeSpec | null) =>
  renderHook(() => useBackgroundSwatches(spec)).result.current;

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useBackgroundSwatches — stored palette", () => {
  it("offers the surface roles in order, lightest-surface-first", () => {
    const swatches = swatchesFor({
      appearance: "DARK",
      palette: palette({
        canvas: "#1e1e2e",
        surface: "#313244",
        surfaceRaised: "#45475a",
        subtle: "#181825",
      }),
    });

    expect(swatches).toEqual(["#1e1e2e", "#313244", "#45475a", "#181825"]);
  });

  it("skips surfaces the hex-only background field could not hold", () => {
    const swatches = swatchesFor({
      palette: palette({
        canvas: "#1e1e2e",
        surface: "oklch(0.3 0.02 280)",
        surfaceRaised: "#45475aff", // 8-digit: alpha the field rejects
        subtle: "#182", // 3-digit
      }),
    });

    expect(swatches).toEqual(["#1e1e2e"]);
  });

  it("collapses roles that share a colour, whatever the hex casing", () => {
    const swatches = swatchesFor({
      palette: palette({
        canvas: "#1E1E2E",
        surface: "#1e1e2e",
        surfaceRaised: "#45475a",
        subtle: "#45475A",
      }),
    });

    expect(swatches).toEqual(["#1E1E2E", "#45475a"]);
  });

  it("reads nothing off the DOM when the palette already has surfaces", () => {
    const probes = stubCascade(CASCADE);

    expect(swatchesFor({ palette: palette({ canvas: "#1e1e2e" }) })).toEqual([
      "#1e1e2e",
    ]);
    expect(probes).toEqual([]);
  });
});

describe("useBackgroundSwatches — cascade fallback", () => {
  it("resolves the role vars off a probe for a palette-less spec", () => {
    stubCascade(CASCADE);

    // Alpha is pinned opaque, the repeat colour dedupes, and the role that
    // resolves to nothing drops out.
    expect(swatchesFor({ appearance: "DARK" })).toEqual(["#ffffff", "#123456"]);
  });

  it("flags the probe with the spec's appearance, and inherits without one", () => {
    const probes = stubCascade(CASCADE);

    swatchesFor({ appearance: "DARK" });
    swatchesFor({ palette: palette({ canvas: "oklch(0.3 0.02 280)" }) }); // no usable surface
    swatchesFor(undefined);

    const flags = probes.map((probe) => probe.dataset.appearance);
    expect(flags).toEqual(["dark", "light", undefined]);
  });

  it("falls back when a palette holds no surface the field accepts", () => {
    stubCascade(CASCADE);

    expect(swatchesFor({ palette: palette({ canvas: "oklch(0.3 0.02 280)" }) })).toEqual(
      ["#ffffff", "#123456"],
    );
  });

  it("leaves no probe behind", () => {
    const probes = stubCascade(CASCADE);

    swatchesFor(null);

    expect(probes.length).toBeGreaterThan(0);
    for (const probe of probes) expect(probe.isConnected).toBe(false);
  });

  it("offers only hex, never a live var(), when the cascade cannot be read", () => {
    // Unstubbed jsdom: no var() resolution and no live declaration, so the
    // probe reads back whatever it started as. Whatever survives must still be
    // a persistable 6-digit hex.
    for (const swatch of swatchesFor(null)) {
      expect(swatch).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});
