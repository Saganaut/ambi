// Narrowing predicates over the resolved `CurrentUserState` (see
// hooks/useCurrentUser.ts). Everything keys off the `state` discriminator now —
// the old `isGuest` boolean / `name`-presence checks are gone with the backend
// rewrite. These are advisory UX helpers; the backend's 401/403 is the
// authoritative gate.
import type { CurrentUserState } from "../hooks/useCurrentUser";

type Registered = Extract<CurrentUserState, { state: "registered" }>;
type Guest = Extract<CurrentUserState, { state: "guest" }>;
type PreRegistration = Extract<CurrentUserState, { state: "preRegistration" }>;

export function isRegistered(auth: CurrentUserState): auth is Registered {
  return auth.state === "registered";
}

export function isGuest(auth: CurrentUserState): auth is Guest {
  return auth.state === "guest";
}

export function isPreRegistration(
  auth: CurrentUserState,
): auth is PreRegistration {
  return auth.state === "preRegistration";
}

/** True for any state backed by a real session (guest or registered). */
export function isAuthenticated(
  auth: CurrentUserState,
): auth is Registered | Guest {
  return auth.state === "registered" || auth.state === "guest";
}
