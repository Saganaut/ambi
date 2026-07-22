// Frontend palette helpers shared by the theme editor and the swatch previews.
// The 16 roles mirror the backend Palette record; tokens.css derives every
// semantic token from them (see applyPalette).
import type { Palette } from "@features/theme/store/themeApi.gen";

// A neutral light palette used as the starting point when authoring a new theme
// (or when an old, palette-less spec is opened in the editor). Hex so the native
// colour inputs accept it directly.
export const DEFAULT_PALETTE: Palette = {
  canvas: "#ffffff",
  surface: "#f2f2f2",
  surfaceRaised: "#ffffff",
  subtle: "#e6e6e6",
  foreground: "#1f1633",
  mutedForeground: "#5c5c66",
  primary: "#6019ff",
  onPrimary: "#f5f5f5",
  accent: "#0c8ea3",
  accentSecondary: "#ff6e0b",
  border: "#3a1f7a",
  borderSubtle: "#c9bfe6",
  red: "#d8362a",
  green: "#2f9e44",
  yellow: "#e8b400",
  blue: "#1e66f5",
};

// The roles shown in compact palette previews (theme-card pips + editor
// preview dots), in display order. The preview surface itself is painted with
// the palette's `canvas`, so canvas/surface are omitted from the dots.
export const PALETTE_PREVIEW_ROLES: (keyof Palette)[] = [
  "primary",
  "accent",
  "accentSecondary",
  "foreground",
];
