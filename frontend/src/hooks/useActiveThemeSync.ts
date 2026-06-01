// TODO this needs to be refactored based upon our new theme shape whihc is TBD
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
