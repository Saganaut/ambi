// One app-wide "recently used" color list feeding every DS color picker's
// Recent row (text color, option/item color, backgrounds). The picker treats
// recents as caller-owned; this module is that owner: a tiny external store
// (so every open picker re-renders on a commit anywhere) persisted to
// localStorage so recents survive reloads. Storage failures (private mode,
// quota) silently degrade to in-memory-only.
import { useSyncExternalStore } from "react";

import type { ColorValue } from "@components/Forms/Input/ColorPicker/ColorPickerNew/ColorPickerNew";
import { isColorValue } from "@components/Forms/Input/ColorPicker/ColorPickerNew/colorConversion";

// Key naming follows useTheme's "ambi-theme-spec".
const STORAGE_KEY = "ambi-recent-colors";
const MAX_RECENT_COLORS = 8;

const loadStoredColors = (): ColorValue[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isColorValue).slice(0, MAX_RECENT_COLORS);
  } catch {
    return [];
  }
};

let recentColors: ColorValue[] = loadStoredColors();
const listeners = new Set<() => void>();

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const getSnapshot = () => recentColors;

/** Record a committed color, newest first, deduplicated, capped at 8. */
export function addRecentColor(color: ColorValue): void {
  recentColors = [
    color,
    ...recentColors.filter((existing) => existing !== color),
  ].slice(0, MAX_RECENT_COLORS);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(recentColors));
  } catch {
    // Keep the in-memory list; persistence is best-effort.
  }
  listeners.forEach((notify) => {
    notify();
  });
}

/** The shared recent colors, newest first — for `recentlyUsedColorSwatch`. */
export function useRecentColors(): ColorValue[] {
  return useSyncExternalStore(subscribe, getSnapshot);
}
