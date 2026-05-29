// Mounts once at the root layout to make the server's `activeThemeId` the
// source of truth for which hue/mode is applied. Reads the current user via
// RTK Query (through useCurrentUser, which narrows the discriminated state
// machine) and looks up the active theme in the themes list; when it
// resolves (or changes), it applies the server's hue + mode through the
// same path useTheme uses, so localStorage gets overwritten on the way out.
// localStorage stays useful as the boot-time optimistic cache (so the
// initial paint doesn't flash) but never wins against the server.
import { useEffect } from "react";
import { useListThemesQuery } from "../store/AmbiApi";
import { useCurrentUser } from "./useCurrentUser";
import { useTheme } from "./useTheme";
import { apiToUiMode } from "../utils/themeMode";

const useActiveThemeSync = () => {
  const userState = useCurrentUser();
  const registeredUser =
    userState.state === "registered" ? userState.user : null;
  const activeThemeId = registeredUser?.activeThemeId;

  // The themes endpoint is auth-gated. Skipping for visitors/guests avoids a
  // 401 on every page load; those branches fall through to the
  // localStorage-hydrated useTheme defaults, which is exactly what we want.
  const { data: themes = [] } = useListThemesQuery(undefined, {
    skip: !registeredUser || !activeThemeId,
  });

  const { setHuePrimary, setHueAccent, setTheme } = useTheme();

  useEffect(() => {
    if (!activeThemeId) return;
    const active = themes.find((t) => t.id === activeThemeId);
    if (!active) return;
    if (typeof active.huePrimary === "number") setHuePrimary(active.huePrimary);
    if (typeof active.hueAccent === "number") setHueAccent(active.hueAccent);
    const uiMode = apiToUiMode(active.mode);
    if (uiMode === "light" || uiMode === "dark") setTheme(uiMode);
    // useTheme's setters are new function references each render but wrap
    // React state setters that no-op on identical input; only the server-side
    // identity should drive this effect.
    // eslint-disable-next-line react-hooks/exhaustive-deps, react-x/exhaustive-deps
  }, [activeThemeId, themes]);
};

export { useActiveThemeSync };
