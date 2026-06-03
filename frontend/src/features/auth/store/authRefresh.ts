// Shared, single-flight access-token refresh — deliberately framework-agnostic
// (no RTK, no React) so the future live-session WebSocket client can await the
// exact same primitive on a failed/reconnecting handshake. The token itself is
// never read or passed by JS: the HttpOnly AMBI_RT cookie rides
// `credentials: "include"`, and the backend's rotation lands via Set-Cookie
// straight into the browser jar. We only ever learn success/failure.
//
// WHY single-flight is mandatory, not a nicety: every `/api/auth/refresh`
// rotates the refresh token and burns the old one, and replaying a burned
// token trips the backend's reuse-detection, which revokes the *entire* token
// family (instant logout). Two concurrent refreshes — e.g. two requests 401ing
// at once, or an HTTP 401 racing a WS reconnect — would do exactly that. The
// module-level `inFlight` promise guarantees at most one refresh is ever live;
// every other caller awaits it.
import { apiBaseUrl } from "@store/emptyApi";

const XSRF_COOKIE = "XSRF-TOKEN";
const XSRF_HEADER = "X-XSRF-TOKEN";

/**
 * Reads the CSRF token the backend writes as a non-HttpOnly cookie
 * (CookieCsrfTokenRepository.withHttpOnlyFalse). This is the one auth-related
 * cookie JS is allowed to see; it must be echoed back in the X-XSRF-TOKEN
 * header on every mutation, refresh included.
 */
export function readXsrfToken(): string | undefined {
  const match = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${XSRF_COOKIE}=`));
  return match
    ? decodeURIComponent(match.slice(XSRF_COOKIE.length + 1))
    : undefined;
}

let inFlight: Promise<boolean> | null = null;

/**
 * Slides the session by hitting `POST /api/auth/refresh`. Returns `true` on a
 * successful rotation, `false` on REFRESH_FAILED (missing/invalid/replayed
 * token) or a network error. Concurrent callers share one in-flight request;
 * `inFlight` resets once it settles so a later expiry can refresh again.
 */
export function refreshSession(): Promise<boolean> {
  if (inFlight) return inFlight;

  inFlight = (async () => {
    try {
      const xsrf = readXsrfToken();
      const res = await fetch(`${apiBaseUrl}/api/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: xsrf ? { [XSRF_HEADER]: xsrf } : {},
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      inFlight = null;
    }
  })();

  return inFlight;
}
