// Resolves the `GET /api/auth/me` probe into one of the typed session states
// the rest of the app branches on. The backend's MeResponse expresses all four
// identity states through a single `state` discriminator (+ nullability); this
// hook mirrors that into a discriminated union so callers never have to reach
// for nullable fields or remember which ones are populated per state.
//
// Note `/api/auth/me` never returns 401 — it always 200s with a visitor
// payload for an anonymous caller — so `error` here means a genuine network /
// server failure, NOT "not signed in".
import { useMeQuery } from "../store/AmbiApi";
import type { MeResponse } from "../store/AmbiApi";

// Derived from the generated client so they track the backend enums (UserLevel,
// MembershipTier) automatically on the next codegen run.
export type UserLevel = NonNullable<MeResponse["userLevel"]>;
export type MembershipTier = NonNullable<MeResponse["effectiveTier"]>;

export type CurrentUserState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "visitor" }
  | {
      state: "guest";
      me: MeResponse;
      userLevel: UserLevel;
      effectiveTier: MembershipTier;
    }
  | { state: "preRegistration"; me: MeResponse; email?: string }
  | {
      state: "registered";
      me: MeResponse;
      userLevel: UserLevel;
      effectiveTier: MembershipTier;
    };

export function useCurrentUser(): CurrentUserState {
  const { data, isLoading, isError } = useMeQuery();

  if (isLoading) return { state: "loading" };
  if (isError || data == null) return { state: "error" };

  switch (data.state) {
    case "REGISTERED":
      // userLevel/effectiveTier are guaranteed populated for a registered
      // principal (MeResponse javadoc Inv 7); the `!` documents that contract.
      return {
        state: "registered",
        me: data,
        userLevel: data.userLevel!,
        effectiveTier: data.effectiveTier!,
      };
    case "GUEST":
      return {
        state: "guest",
        me: data,
        userLevel: data.userLevel!,
        effectiveTier: data.effectiveTier!,
      };
    case "PRE_REGISTRATION":
      return { state: "preRegistration", me: data, email: data.email };
    case "VISITOR":
    default:
      return { state: "visitor" };
  }
}
