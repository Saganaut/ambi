// Narrowing predicates over the resolved `CurrentUserState` (see
// hooks/useCurrentUser.ts). Everything keys off the `state` discriminator now —
// the old `isGuest` boolean / `name`-presence checks are gone with the backend
// rewrite. These are advisory UX helpers; the backend's 401/403 is the
// authoritative gate.
import type { FetchBaseQueryError } from "@reduxjs/toolkit/query";
import type { CurrentUserState } from "@auth/hooks/useCurrentUser";

/**
 * RFC 9457 ProblemDetail — the standard error shape sent by the backend.
 * See z-docs/features/exceptions.md for the full contract.
 */
export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance: string;
  code: string;
  traceId: string;
  errors?: Array<{ field: string; message: string }>;
}

/** Narrows an unknown RTK Query error to the HTTP-fetch branch (status is a number). */
export function isFetchBaseQueryError(
  error: unknown,
): error is FetchBaseQueryError & { status: number; data: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status: unknown }).status === "number"
  );
}

/** Narrows an unknown value to a ProblemDetail response body. */
export function isProblemDetail(data: unknown): data is ProblemDetail {
  return (
    typeof data === "object" &&
    data !== null &&
    "status" in data &&
    typeof (data as ProblemDetail).status === "number" &&
    "title" in data &&
    typeof (data as ProblemDetail).title === "string" &&
    "detail" in data &&
    typeof (data as ProblemDetail).detail === "string"
  );
}

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
