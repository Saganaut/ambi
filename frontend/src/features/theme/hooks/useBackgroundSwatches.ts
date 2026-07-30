// The background quick-picks a theme offers: its surface roles, as the 6-digit
// hex the deck/slide background field is validated to (ValidationConstants
// COLOR_HEX_PATTERN). ColorPicker passes a swatch through to onChange verbatim,
// so what is offered here is what gets persisted — a live `var(--role-*)`
// string would be rejected by the backend.
//
// A curated palette already stores hex, so its surfaces pass straight through.
// A palette-less spec (a default theme, or no deck theme at all) has no stored
// colours: its surfaces live in tokens.css as oklch, which getComputedStyle
// hands back with relative-colour syntax intact. They are therefore read off
// the live cascade — a throwaway probe flagged with the spec's appearance
// resolves exactly what the canvas paints, and parseColor converts the
// browser's computed colour to hex. That DOM read is a side effect, hence the
// layout effect; running before paint keeps the swatch row from flashing empty.
import { useLayoutEffect, useState } from "react";
import type { Palette, ThemeSpec } from "@features/theme/store/themeApi.gen";
import {
  hsvaToHex,
  parseColor,
  type ColorValue,
  type HEX,
} from "@shared/components/Forms/Input/ColorPicker/colorConversion";
import { appearanceValue, roleVar } from "@utils/applyPalette";

// The palette roles offered as background swatches — the tones that read as
// backgrounds, ordered lightest-surface-first.
const BACKGROUND_SURFACE_ROLES: (keyof Palette)[] = [
  "canvas",
  "surface",
  "surfaceRaised",
  "subtle",
];

const HEX6_RX = /^#[0-9a-fA-F]{6}$/;

// A theme may map two surface roles to the same colour, and the swatch grid
// keys by colour — so duplicates would collide.
const dedupe = (colors: HEX[]): HEX[] => {
  const seen = new Set<string>();
  return colors.filter((color) => {
    const key = color.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// Palette is typed as free-form CSS colour, so a theme *may* author a surface
// in a format the hex-only field can't hold; those roles are simply skipped.
const storedSurfacesOf = (palette?: Palette): HEX[] =>
  dedupe(
    BACKGROUND_SURFACE_ROLES.map((role) => palette?.[role]).filter(
      (color): color is HEX => typeof color === "string" && HEX6_RX.test(color),
    ),
  );

const resolvedSurfacesFor = (appearance?: "dark" | "light"): HEX[] => {
  if (typeof document === "undefined") return [];
  const probe = document.createElement("div");
  probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none";
  // No flag means "inherit": the probe then resolves whatever theme <html>
  // carries, which is what an unthemed deck's canvas shows.
  if (appearance) probe.dataset.appearance = appearance;
  document.body.appendChild(probe);

  const computed = getComputedStyle(probe);
  const surfaces: HEX[] = [];
  for (const role of BACKGROUND_SURFACE_ROLES) {
    probe.style.color = `var(${roleVar(role)})`;
    const parsed = parseColor(computed.color);
    // Surfaces are opaque; pinning alpha keeps the result at #RRGGBB.
    if (parsed) surfaces.push(hsvaToHex({ ...parsed, a: 1 }));
  }

  probe.remove();
  return dedupe(surfaces);
};

export function useBackgroundSwatches(spec?: ThemeSpec | null): ColorValue[] {
  const storedSurfaces = storedSurfacesOf(spec?.palette);
  const needsCascade = storedSurfaces.length === 0;
  const appearance = appearanceValue(spec);
  const [resolvedSurfaces, setResolvedSurfaces] = useState<HEX[]>([]);

  useLayoutEffect(() => {
    setResolvedSurfaces(needsCascade ? resolvedSurfacesFor(appearance) : []);
  }, [needsCascade, appearance]);

  return needsCascade ? resolvedSurfaces : storedSurfaces;
}
