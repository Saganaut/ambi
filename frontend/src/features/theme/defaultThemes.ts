/**
 * The app's two built-in looks — "Ambi Light" and "Ambi Dark" — as client-side
 * themes rather than database rows.
 *
 * Their colours are tokens.css (the `[data-appearance]` blocks), so a stored
 * copy of the palette could only drift from the stylesheet that actually paints
 * the app. Each therefore carries a spec with an appearance and NO palette —
 * the "built-in default of that appearance" contract that applyPalette honours
 * by clearing the role vars and writing only the flag.
 *
 * The reserved ids below are mirrored by backend constants (so a deck may
 * persist `themeId: "ambi-dark"` and no lookup will ever 404). Every real theme
 * id is a client-minted UUID, so the two can never collide.
 */
import type { ThemeResponse, ThemeSpec } from "./store/themeApi.gen";

const AMBI_LIGHT_ID = "ambi-light";
const AMBI_DARK_ID = "ambi-dark";

/** The reserved ids, in picker order. */
export const DEFAULT_THEME_IDS = [AMBI_LIGHT_ID, AMBI_DARK_ID] as const;

export type DefaultThemeId = (typeof DEFAULT_THEME_IDS)[number];

// Nothing about a stylesheet-backed theme is editable, and everyone sees both,
// so the permissions are fixed rather than viewer-dependent.
const VIEW_ONLY = { canView: true, canEdit: false, canManage: false } as const;

const AMBI_LIGHT: ThemeResponse = {
  id: AMBI_LIGHT_ID,
  name: "Ambi Light",
  builtIn: true,
  spec: { appearance: "LIGHT" },
  permissions: { ...VIEW_ONLY },
};

const AMBI_DARK: ThemeResponse = {
  id: AMBI_DARK_ID,
  name: "Ambi Dark",
  builtIn: true,
  spec: { appearance: "DARK" },
  permissions: { ...VIEW_ONLY },
};

/** Both defaults, in picker order — they lead the preset list. */
export const DEFAULT_THEMES: ThemeResponse[] = [AMBI_LIGHT, AMBI_DARK];

const BY_ID: Readonly<Record<DefaultThemeId, ThemeResponse>> = {
  [AMBI_LIGHT_ID]: AMBI_LIGHT,
  [AMBI_DARK_ID]: AMBI_DARK,
};

const NAMES: ReadonlySet<string> = new Set(DEFAULT_THEMES.map((theme) => theme.name ?? ""));

export function isDefaultThemeId(id?: string | null): id is DefaultThemeId {
  return id != null && id in BY_ID;
}

/** Whether a fetched theme duplicates a default — matched by name, see useThemes. */
export function isDefaultThemeName(name?: string | null): boolean {
  return name != null && NAMES.has(name);
}

export function defaultThemeById(id?: string | null): ThemeResponse | undefined {
  return isDefaultThemeId(id) ? BY_ID[id] : undefined;
}

/**
 * The default theme a spec *is*, for surfaces that persist a spec rather than a
 * theme id (the user's own look) and need to mark the applied card as active.
 * Deliberately exact: anything a default cannot express — a palette, a
 * background or logo image — belongs to some other theme, and a spec with no
 * appearance at all is "no preference", not a choice of Ambi Light.
 */
export function defaultThemeIdForSpec(spec?: ThemeSpec | null): DefaultThemeId | undefined {
  if (!spec?.appearance || spec.palette || spec.backgroundImage || spec.logoImage) {
    return undefined;
  }
  return spec.appearance === "DARK" ? AMBI_DARK_ID : AMBI_LIGHT_ID;
}
