// Conversion seam between the API's theme-mode enum and the frontend's
// lowercase mode convention. The backend `ThemeMode` is UPPERCASE
// (LIGHT/DARK/SYSTEM); the local CSS theme system (useTheme) and the editor
// select work in lowercase ("light"/"dark"/"system") because those values
// double as DOM class suffixes (`theme-dark`) and localStorage entries.
//
// Routing every read/write through these two helpers keeps the uppercase enum
// from leaking into the UI layer (and vice-versa), so there is exactly one
// place to look when the wire format and the DOM convention disagree.
import type { ThemeSpec } from "../store/AmbiApi";

export type ApiThemeMode = NonNullable<ThemeSpec["mode"]>;
export type UiThemeMode = "light" | "dark" | "system";

// API → UI. A missing/unknown value collapses to "system" (follow the OS),
// matching the prior behavior where only an explicit light/dark was pinned.
export const apiToUiMode = (
  mode: ApiThemeMode | undefined | null,
): UiThemeMode =>
  mode === "LIGHT" ? "light" : mode === "DARK" ? "dark" : "system";

// UI → API for the create/update write paths.
export const uiToApiMode = (mode: UiThemeMode): ApiThemeMode =>
  mode === "light" ? "LIGHT" : mode === "dark" ? "DARK" : "SYSTEM";
