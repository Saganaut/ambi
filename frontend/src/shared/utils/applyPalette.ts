// Applies a theme to a DOM element by writing the --role-* custom properties
// (and a data-appearance flag) that tokens.css derives every semantic token
// from. Setting them on <html> themes the whole app (the global theme); setting
// them on a scope wrapper themes just that subtree (a per-deck theme) while the
// rest of the page keeps the inherited theme.
//
// A spec with an appearance but no palette means "the app's built-in default of
// that appearance": the role vars are cleared and only the flag is written, so
// tokens.css resolves all 16 roles from its own light/dark blocks. A spec with
// neither (null, or a legacy two-hue spec) drops the flag as well, so the
// element inherits — on <html> that lands on the built-in light default.
import type { Palette, ThemeSpec } from "@features/theme/store/themeApi.gen";
import type { CSSProperties } from "react";

// Palette field → CSS custom property. The order is irrelevant; the Record keys
// must match the generated `Palette` type exactly.
const ROLE_VARS: Readonly<Record<keyof Palette, string>> = {
  canvas: "--role-canvas",
  surface: "--role-surface",
  surfaceRaised: "--role-surface-raised",
  subtle: "--role-subtle",
  foreground: "--role-foreground",
  mutedForeground: "--role-muted-foreground",
  primary: "--role-primary",
  onPrimary: "--role-on-primary",
  accent: "--role-accent",
  accentSecondary: "--role-accent-secondary",
  border: "--role-border",
  borderSubtle: "--role-border-subtle",
  red: "--role-red",
  green: "--role-green",
  yellow: "--role-yellow",
  blue: "--role-blue",
};

const ROLE_ENTRIES = Object.entries(ROLE_VARS) as [keyof Palette, string][];

/** The CSS custom property a palette role paints, e.g. `--role-surface-raised`. */
export function roleVar(field: keyof Palette): string {
  return ROLE_VARS[field];
}

export function clearPalette(el: HTMLElement): void {
  for (const cssVar of Object.values(ROLE_VARS)) el.style.removeProperty(cssVar);
  delete el.dataset.appearance;
}

/**
 * Writes `spec` onto `el`: its palette as inline role vars (cleared when it has
 * none, leaving the built-in defaults of the flagged appearance to show
 * through) plus the `data-appearance` flag from {@link appearanceValue}.
 */
export function applyPalette(el: HTMLElement, spec?: ThemeSpec | null): void {
  const palette = spec?.palette;
  for (const [field, cssVar] of ROLE_ENTRIES) {
    const value = palette?.[field];
    if (value) el.style.setProperty(cssVar, value);
    else el.style.removeProperty(cssVar);
  }
  const appearance = appearanceValue(spec);
  if (appearance) el.dataset.appearance = appearance;
  else delete el.dataset.appearance;
}

/**
 * The React equivalent of {@link applyPalette} for scoped theming: the --role-*
 * vars as an inline-style object to spread onto a wrapper element (pair it with
 * {@link appearanceValue} for the `data-appearance` attribute). Returns
 * `undefined` for a palette-less spec — such a scope carries only the flag, and
 * takes its colours from the tokens.css block that flag selects.
 */
export function paletteStyle(spec?: ThemeSpec | null): CSSProperties | undefined {
  const palette = spec?.palette;
  if (!palette) return undefined;
  const style: Record<string, string> = {};
  for (const [field, cssVar] of ROLE_ENTRIES) {
    const value = palette[field];
    if (value) style[cssVar] = value;
  }
  return style as CSSProperties;
}

/**
 * The `data-appearance` value for a spec, or `undefined` when it carries
 * neither an appearance nor a palette (nothing to flag — inherit instead).
 * "light" is the default for a palette that omits the appearance, so a light
 * scope nested in a dark global resets correctly (and vice-versa).
 */
export function appearanceValue(spec?: ThemeSpec | null): "dark" | "light" | undefined {
  if (!spec || (!spec.appearance && !spec.palette)) return undefined;
  return spec.appearance === "DARK" ? "dark" : "light";
}
