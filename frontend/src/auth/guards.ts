// Route-guard helpers for TanStack Router `beforeLoad`. These are an advisory
// mirror of the backend's authorization rules — they exist to avoid routing a
// user into UI they'll only get bounced from. The backend's 401/403 is the
// real, authoritative gate (every REST op is server-checked regardless).
//
// Authorization here is the account-class axis (UserLevel) layered on top of
// the session axis (CurrentUserState.state); the two are deliberately distinct
// on the backend (IdentityState vs UserLevel) and we keep them distinct here.
import { redirect } from "@tanstack/react-router";
import type {
  CurrentUserState,
  UserLevel,
  MembershipTier,
} from "../hooks/useCurrentUser";

// Mirrors the weights in backend UserLevel.hasAccessTo — keep in sync if the
// enum gains levels.
const LEVEL_WEIGHT: Record<UserLevel, number> = {
  GUEST: 10,
  USER: 20,
  PREMIUM_USER: 30,
  ADMIN: 100,
  SUPER_ADMIN: 200,
};

/** Hierarchical "level >= min", mirroring backend UserLevel.hasAccessTo. */
export function levelAtLeast(level: UserLevel, min: UserLevel): boolean {
  return LEVEL_WEIGHT[level] >= LEVEL_WEIGHT[min];
}

// Entitlement axis. Ordering follows the backend MembershipTier declaration
// order; a strict linear "at least" is a UX approximation (org tiers aren't a
// clean superset of INDIVIDUAL) — entitlement-gated actions are still backed by
// a server check.
const TIER_ORDER: MembershipTier[] = [
  "FREE",
  "INDIVIDUAL",
  "ORG_SEAT",
  "ORG_TEAM",
  "ORG_BUSINESS",
];

/** Entitlement "tier >= min" by declaration order. */
export function tierAtLeast(tier: MembershipTier, min: MembershipTier): boolean {
  return TIER_ORDER.indexOf(tier) >= TIER_ORDER.indexOf(min);
}

// `beforeLoad` hands us a location; we only need its relative href for the
// returnUrl round-trip (the backend ReturnUrlValidator requires a leading "/"
// and rejects absolute URLs — TanStack's `href` is already that shape).
interface GuardLocation {
  href: string;
}

/** Redirect target for a session that isn't allowed past a registered gate. */
function bounce(auth: CurrentUserState, location: GuardLocation): never {
  // An OAuth'd-but-unregistered principal has exactly one place to go: finish
  // signing up. Everyone else lands on the public home with the login prompt
  // armed and the blocked path preserved as returnUrl.
  if (auth.state === "preRegistration") {
    throw redirect({ to: "/register" });
  }
  throw redirect({
    to: "/",
    search: { authPrompt: true, returnUrl: location.href },
  });
}

/**
 * Gate a route behind a registered session. Returns (passes) while auth is
 * still `loading` — the gate component renders the loading frame and a
 * `router.invalidate()` re-runs this guard once `/api/auth/me` resolves.
 */
export function requireRegistered(
  auth: CurrentUserState,
  location: GuardLocation,
): void {
  if (auth.state === "loading") return;
  if (auth.state === "registered") return;
  bounce(auth, location);
}

/**
 * Gate a route behind a registered session AT LEAST `min` level (e.g. ADMIN).
 * Composes on top of `requireRegistered`.
 */
export function requireLevel(
  auth: CurrentUserState,
  min: UserLevel,
  location: GuardLocation,
): void {
  if (auth.state === "loading") return;
  requireRegistered(auth, location);
  if (auth.state === "registered" && !levelAtLeast(auth.userLevel, min)) {
    bounce(auth, location);
  }
}

/**
 * Gate the registration screen: only a PRE_REGISTRATION session (OAuth'd, no
 * account yet) belongs there. An already-registered user is sent home; a
 * visitor/guest is sent home with the login prompt (they must authenticate via
 * a provider before there's anything to register). Passes through while loading.
 */
export function requirePreRegistration(
  auth: CurrentUserState,
  location: GuardLocation,
): void {
  if (auth.state === "loading") return;
  if (auth.state === "preRegistration") return;
  if (auth.state === "registered") throw redirect({ to: "/" });
  throw redirect({
    to: "/",
    search: { authPrompt: true, returnUrl: location.href },
  });
}
