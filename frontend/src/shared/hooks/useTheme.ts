// Applies the user's GLOBAL theme to the whole app by writing its palette onto
// <html> (see applyPalette / tokens.css). A theme is a curated palette plus an
// intrinsic light/dark appearance — there is no separate light/dark toggle.
//
// Source of truth for "which look is mine":
//   • Registered users — the server, via `preferences.theme` (a ThemeSpec) on
//     GET /api/users/me. Applying a theme (Account → Browse themes) writes that
//     preference; this hook mirrors the resolved spec onto <html>. The
//     /api/users/me read is auth-gated, so it is skipped for non-registered
//     callers.
//   • Guests / visitors — localStorage only, since they have no server identity.
//
// localStorage also holds the boot-time optimistic cache for everyone, so the
// first paint doesn't flash the brand default before the server look resolves.
//
// Mount once, near the app root (see ThemeBridge) — it renders nothing and only
// runs the apply side-effect.
import { useEffect, useState } from "react";
import { useGetMeQuery } from "@auth/store/userApi.gen";
import { type ThemeSpec } from "@features/theme/store/themeApi.gen";
import { applyPalette } from "../utils/applyPalette";
import { useCurrentUser } from "@auth/hooks/useCurrentUser";

const STORAGE_KEY = "ambi-theme-spec";

const getStoredSpec = (): ThemeSpec | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ThemeSpec) : null;
  } catch {
    return null;
  }
};

export function useTheme() {
  const userState = useCurrentUser();
  const isRegistered = userState.state === "registered";

  // Auth-gated; skipping it for non-registered callers avoids a 401 and falls
  // through to the localStorage-hydrated spec below — what guests want.
  const { data: profile } = useGetMeQuery(undefined, { skip: !isRegistered });

  const [spec, setSpec] = useState<ThemeSpec | null>(() => getStoredSpec());

  // Server → local. Once the registered user's profile has loaded, mirror its
  // saved theme — including its ABSENCE: a reset clears `preferences.theme`, and
  // mirroring `null` reverts the app to the brand default. We gate on `profile`
  // (not the spec) so the localStorage-hydrated look survives the initial load
  // window before the profile resolves, rather than flashing the default.
  useEffect(() => {
    if (!isRegistered || !profile) return;
    setSpec(profile.preferences?.theme ?? null);
  }, [isRegistered, profile]);

  // Apply to <html> + refresh the boot cache. A null spec clears the role vars,
  // reverting to the brand defaults in tokens.css.
  useEffect(() => {
    applyPalette(document.documentElement, spec);
    if (spec) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(spec));
    else window.localStorage.removeItem(STORAGE_KEY);
  }, [spec]);

  return { spec };
}
