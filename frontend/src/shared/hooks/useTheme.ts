// Hook managing light/dark mode, the two brand hue variables, and whether a
// custom (hue-derived) theme is active. Default mode uses the named brand
// palette in tokens.css; toggling customTheme adds .theme-custom to <html>,
// which overrides semantic tokens with hue-derived oklch values.
//
// Source of truth for "which look is mine":
//   • Registered users — the server, via `preferences.theme` (a ThemeSpec) on
//     GET /api/users/me. RTK Query caches that read under the `Preferences`
//     tag; setters write through PUT /api/users/me/preferences, which
//     invalidates the tag so every subscriber reconciles (see
//     store/enhancements/preferences.ts). The `/api/users/me` read is
//     auth-gated, so it is skipped for anyone not registered.
//   • Guests / visitors — localStorage only, since they have no server-side
//     identity yet.
//
// localStorage also holds the boot-time optimistic cache for everyone so the
// first paint doesn't flash a default theme before the server look resolves.
import { useEffect, useState } from "react";
import { useGetMeQuery } from "@auth/store/userApi.gen";
import { useUpdatePreferencesMutation } from "@account/store/accountApi.gen";
import { type ThemeSpec } from "@features/theme/store/themeApi.gen";
import { apiToUiMode, uiToApiMode } from "../utils/themeMode";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "ambi-theme";
const HUE_PRIMARY_KEY = "ambi-hue-primary";
const HUE_ACCENT_KEY = "ambi-hue-accent";
const CUSTOM_THEME_KEY = "ambi-theme-custom";

// Hues of electric-violet and blaze-orange — the brand primary/accent.
export const DEFAULT_HUE_PRIMARY = 290;
export const DEFAULT_HUE_ACCENT = 50;

const getSystemTheme = (): ThemeMode => {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
};

const getStoredTheme = (): ThemeMode | null => {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === "dark" || stored === "light" ? stored : null;
};

const getStoredHue = (key: string, fallback: number): number => {
  if (typeof window === "undefined") return fallback;
  const stored = window.localStorage.getItem(key);
  if (stored === null) return fallback;
  const n = Number(stored);
  return Number.isFinite(n) && n >= 0 && n <= 360 ? n : fallback;
};

const getStoredCustomTheme = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(CUSTOM_THEME_KEY) === "true";
};

const applyThemeClass = (theme: ThemeMode) => {
  const html = document.documentElement;
  if (theme === "dark") {
    html.classList.add("theme-dark");
    html.classList.remove("theme-light");
  } else {
    html.classList.add("theme-light");
    html.classList.remove("theme-dark");
  }
};

const applyCustomThemeClass = (custom: boolean) => {
  const html = document.documentElement;
  if (custom) {
    html.classList.add("theme-custom");
  } else {
    html.classList.remove("theme-custom");
  }
};

const clampHue = (hue: number) => Math.round(Math.max(0, Math.min(360, hue)));

// Hues that differ from the brand defaults imply a custom (hue-derived) look —
// the server stores no separate "is custom" flag, so we derive it from the spec.
const isCustomSpec = (huePrimary: number, hueAccent: number): boolean =>
  huePrimary !== DEFAULT_HUE_PRIMARY || hueAccent !== DEFAULT_HUE_ACCENT;

export function useTheme() {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  // The profile read is auth-gated; skipping it for non-registered callers
  // avoids a 401 (which would trip the login-prompt funnel) and falls through
  // to the localStorage-hydrated defaults below — exactly what guests want.
  const { data: profile } = useGetMeQuery(undefined, { skip: !isRegistered });
  const [savePreferences] = useUpdatePreferencesMutation();

  const [theme, setThemeState] = useState<ThemeMode>(() => {
    const stored = getStoredTheme();
    return stored ?? getSystemTheme();
  });

  const [huePrimary, setHuePrimaryState] = useState<number>(() =>
    getStoredHue(HUE_PRIMARY_KEY, DEFAULT_HUE_PRIMARY),
  );

  const [hueAccent, setHueAccentState] = useState<number>(() =>
    getStoredHue(HUE_ACCENT_KEY, DEFAULT_HUE_ACCENT),
  );

  const [customTheme, setCustomTheme] = useState<boolean>(() =>
    getStoredCustomTheme(),
  );

  // Server → local. When the registered user's saved spec resolves (or a
  // tag-driven refetch lands a new one), mirror it into local state. Runs only
  // on real value changes, so it never fights the optimistic local update a
  // setter already applied — they converge on the same values.
  const serverMode = profile?.preferences?.theme?.mode;
  const serverHuePrimary = profile?.preferences?.theme?.huePrimary;
  const serverHueAccent = profile?.preferences?.theme?.hueAccent;
  useEffect(() => {
    if (!isRegistered) return;
    const uiMode = apiToUiMode(serverMode);
    setThemeState(uiMode === "system" ? getSystemTheme() : uiMode);
    if (typeof serverHuePrimary === "number")
      setHuePrimaryState(clampHue(serverHuePrimary));
    if (typeof serverHueAccent === "number")
      setHueAccentState(clampHue(serverHueAccent));
    setCustomTheme(
      isCustomSpec(
        serverHuePrimary ?? DEFAULT_HUE_PRIMARY,
        serverHueAccent ?? DEFAULT_HUE_ACCENT,
      ),
    );
  }, [isRegistered, serverMode, serverHuePrimary, serverHueAccent]);

  useEffect(() => {
    applyThemeClass(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--hue-primary",
      `${huePrimary}deg`,
    );
    window.localStorage.setItem(HUE_PRIMARY_KEY, String(huePrimary));
  }, [huePrimary]);

  useEffect(() => {
    document.documentElement.style.setProperty(
      "--hue-accent",
      `${hueAccent}deg`,
    );
    window.localStorage.setItem(HUE_ACCENT_KEY, String(hueAccent));
  }, [hueAccent]);

  useEffect(() => {
    applyCustomThemeClass(customTheme);
    window.localStorage.setItem(CUSTOM_THEME_KEY, String(customTheme));
  }, [customTheme]);

  // Local → server. PUT /api/users/me/preferences is a wholesale replace, so we
  // resend the rest of the user's preferences alongside the new theme spec to
  // avoid clobbering them. No-ops for guests/visitors, who live in localStorage.
  const persistSpec = (spec: ThemeSpec) => {
    if (!isRegistered) return;
    const prefs = profile?.preferences;
    void savePreferences({
      updatePreferencesRequest: {
        newsletter: prefs?.newsletter ?? false,
        marketing: prefs?.marketing ?? false,
        stayLoggedIn: prefs?.stayLoggedIn ?? false,
        theme: spec,
      },
    });
  };

  // Builds the full spec from the current look plus an override, preserving the
  // server-side images (which this hook doesn't edit) so a write never drops them.
  const specWith = (override: Partial<ThemeSpec>): ThemeSpec => ({
    mode: uiToApiMode(theme),
    huePrimary,
    hueAccent,
    backgroundImage: profile?.preferences?.theme?.backgroundImage,
    logoImage: profile?.preferences?.theme?.logoImage,
    ...override,
  });

  const setTheme = (next: ThemeMode) => {
    setThemeState(next);
    persistSpec(specWith({ mode: uiToApiMode(next) }));
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  const setHuePrimary = (hue: number) => {
    const clamped = clampHue(hue);
    setHuePrimaryState(clamped);
    setCustomTheme(true);
    persistSpec(specWith({ huePrimary: clamped }));
  };

  const setHueAccent = (hue: number) => {
    const clamped = clampHue(hue);
    setHueAccentState(clamped);
    setCustomTheme(true);
    persistSpec(specWith({ hueAccent: clamped }));
  };

  const resetHues = () => {
    setHuePrimaryState(DEFAULT_HUE_PRIMARY);
    setHueAccentState(DEFAULT_HUE_ACCENT);
    setCustomTheme(false);
    persistSpec(
      specWith({
        huePrimary: DEFAULT_HUE_PRIMARY,
        hueAccent: DEFAULT_HUE_ACCENT,
      }),
    );
  };

  return {
    theme,
    toggleTheme,
    setTheme,
    huePrimary,
    hueAccent,
    customTheme,
    setCustomTheme,
    setHuePrimary,
    setHueAccent,
    resetHues,
  };
}
