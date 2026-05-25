// Hook managing light/dark mode, the two brand hue variables, and whether a
// custom (hue-derived) theme is active. Default mode uses the named brand
// palette in tokens.css; toggling customTheme adds .theme-custom to <html>,
// which overrides semantic tokens with hue-derived oklch values.
//
// localStorage holds the boot-time optimistic cache so the first paint
// doesn't flash a default theme. For registered users, ActiveThemeBridge (→
// useActiveThemeSync) overwrites that cache from the server's activeThemeId
// as soon as RTK Query resolves — the server, not localStorage, is the
// source of truth for "which theme is mine." Guest/anon users get
// localStorage-only behavior since they have no server-side identity yet.
import { useEffect, useState } from "react";

export type ThemeMode = "light" | "dark";

const STORAGE_KEY = "brainflex-theme";
const HUE_PRIMARY_KEY = "brainflex-hue-primary";
const HUE_ACCENT_KEY = "brainflex-hue-accent";
const CUSTOM_THEME_KEY = "brainflex-theme-custom";

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

export function useTheme() {
  const [theme, setTheme] = useState<ThemeMode>(() => {
    const stored = getStoredTheme();
    return stored ?? getSystemTheme();
  });

  const [huePrimary, setHuePrimary] = useState<number>(() =>
    getStoredHue(HUE_PRIMARY_KEY, DEFAULT_HUE_PRIMARY),
  );

  const [hueAccent, setHueAccent] = useState<number>(() =>
    getStoredHue(HUE_ACCENT_KEY, DEFAULT_HUE_ACCENT),
  );

  const [customTheme, setCustomTheme] = useState<boolean>(() =>
    getStoredCustomTheme(),
  );

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

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  const resetHues = () => {
    setHuePrimary(DEFAULT_HUE_PRIMARY);
    setHueAccent(DEFAULT_HUE_ACCENT);
    setCustomTheme(false);
  };

  return {
    theme,
    toggleTheme,
    setTheme,
    huePrimary,
    hueAccent,
    customTheme,
    setCustomTheme,
    setHuePrimary: (hue: number) => {
      setHuePrimary(clampHue(hue));
      setCustomTheme(true);
    },
    setHueAccent: (hue: number) => {
      setHueAccent(clampHue(hue));
      setCustomTheme(true);
    },
    resetHues,
  };
}
