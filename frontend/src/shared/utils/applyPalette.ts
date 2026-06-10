// Applies a theme's palette to a DOM element by writing the --role-* custom
// properties (and a data-appearance flag) that tokens.css derives every
// semantic token from. Setting them on <html> themes the whole app (the global
// theme); setting them on a scope wrapper themes just that subtree (a per-deck
// theme) while the rest of the page keeps the inherited theme.
//
// A null/legacy spec (e.g. an old two-hue spec with no `palette`) clears the
// vars, so the element falls back to the brand defaults baked into tokens.css.
import type { CSSProperties } from "react";
import type { Palette, ThemeSpec } from "@features/theme/store/themeApi.gen";

// Palette field → CSS custom property. The order is irrelevant; the keys must
// match the generated `Palette` type exactly.
const ROLE_VARS: ReadonlyArray<readonly [keyof Palette, string]> = [
  ["canvas", "--role-canvas"],
  ["surface", "--role-surface"],
  ["surfaceRaised", "--role-surface-raised"],
  ["subtle", "--role-subtle"],
  ["foreground", "--role-foreground"],
  ["mutedForeground", "--role-muted-foreground"],
  ["primary", "--role-primary"],
  ["onPrimary", "--role-on-primary"],
  ["accent", "--role-accent"],
  ["accentSecondary", "--role-accent-secondary"],
  ["border", "--role-border"],
  ["borderSubtle", "--role-border-subtle"],
  ["red", "--role-red"],
  ["green", "--role-green"],
  ["yellow", "--role-yellow"],
  ["blue", "--role-blue"],
];

/** Removes every --role-* var and the appearance flag, reverting to defaults. */
export function clearPalette(el: HTMLElement): void {
  for (const [, cssVar] of ROLE_VARS) el.style.removeProperty(cssVar);
  delete el.dataset.appearance;
}

/**
 * Writes `spec`'s palette onto `el`. A spec without a palette (or no spec)
 * clears the element so it inherits/falls back to the brand defaults.
 */
export function applyPalette(el: HTMLElement, spec?: ThemeSpec | null): void {
  const palette = spec?.palette;
  if (!palette) {
    clearPalette(el);
    return;
  }
  for (const [field, cssVar] of ROLE_VARS) {
    const value = palette[field];
    if (value) el.style.setProperty(cssVar, value);
    else el.style.removeProperty(cssVar);
  }
  // tokens.css keys --edge-tint / --shadow off this; "light" is the default so a
  // light scope nested in a dark global resets correctly (and vice-versa).
  el.dataset.appearance = spec?.appearance === "DARK" ? "dark" : "light";
}

/**
 * The React equivalent of {@link applyPalette} for scoped theming: the --role-*
 * vars as an inline-style object to spread onto a wrapper element (pair it with
 * {@link appearanceValue} for the `data-appearance` attribute). Returns
 * `undefined` for a palette-less spec so callers can fall through to the
 * inherited theme. Custom properties aren't in the CSSProperties type, hence
 * the cast.
 */
export function paletteStyle(spec?: ThemeSpec | null): CSSProperties | undefined {
  const palette = spec?.palette;
  if (!palette) return undefined;
  const style: Record<string, string> = {};
  for (const [field, cssVar] of ROLE_VARS) {
    const value = palette[field];
    if (value) style[cssVar] = value;
  }
  return style as CSSProperties;
}

/** The `data-appearance` value for a spec, or `undefined` if it has no palette. */
export function appearanceValue(
  spec?: ThemeSpec | null,
): "dark" | "light" | undefined {
  if (!spec?.palette) return undefined;
  return spec.appearance === "DARK" ? "dark" : "light";
}
