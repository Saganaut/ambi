// Resolves the `GET /api/auth/me` probe into one of the typed session states
// the rest of the app branches on. The backend models MeResponse as a real
// discriminated union (oneOf + a `state` discriminator), so the generated
// client already narrows each variant to its guaranteed fields — this hook just
// maps that onto the app's own union, which adds the client-only `loading` and
// `error` states.
//
// Note `/api/auth/me` never returns 401 — it always 200s with a visitor
// payload for an anonymous caller — so `error` here means a genuine network /
// server failure, NOT "not signed in".
import { useMeQuery } from "../store/AmbiApi";
import type {
  GuestMe,
  PreRegistrationMe,
  RegisteredMe,
} from "../store/AmbiApi";

// Taken from the registered variant — the one that always carries them — so
// they track the backend enums (UserLevel, MembershipTier) on each codegen run.
export type UserLevel = RegisteredMe["userLevel"];
export type MembershipTier = RegisteredMe["effectiveTier"];

export type CurrentUserState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "visitor" }
  | {
      state: "guest";
      me: GuestMe;
      userLevel: UserLevel;
      effectiveTier: MembershipTier;
    }
  | { state: "preRegistration"; me: PreRegistrationMe; email: string }
  | {
      state: "registered";
      me: RegisteredMe;
      userLevel: UserLevel;
      effectiveTier: MembershipTier;
    };

export function useCurrentUser(): CurrentUserState {
  const { data, isLoading, isError } = useMeQuery();

  if (isLoading) return { state: "loading" };
  if (isError || data == null) return { state: "error" };

  // `data` is the discriminated union; each `case` narrows it to the variant
  // whose required fields are guaranteed present — no non-null assertions.
  switch (data.state) {
    case "REGISTERED":
      return {
        state: "registered",
        me: data,
        userLevel: data.userLevel,
        effectiveTier: data.effectiveTier,
      };
    case "GUEST":
      return {
        state: "guest",
        me: data,
        userLevel: data.userLevel,
        effectiveTier: data.effectiveTier,
      };
    case "PRE_REGISTRATION":
      return { state: "preRegistration", me: data, email: data.email };
    case "VISITOR":
    default:
      return { state: "visitor" };
  }
}

type RegisteredState = Extract<CurrentUserState, { state: "registered" }>;
type SessionState = Extract<
  CurrentUserState,
  { state: "registered" | "guest" }
>;

/**
 * The registered session, narrowed and non-null. For components rendered under
 * the `_authenticated` layout, where the route guard's redirect plus the
 * layout's loading gate guarantee a registered session by the time they mount —
 * so callers skip the `state` check and read `me`/`userLevel`/`effectiveTier`
 * directly.
 *
 * Throws if reached without a registered session: a loud signal it's being used
 * outside the gate (use {@link useSessionUser} or {@link useCurrentUser} there).
 */
export function useRegisteredUser(): RegisteredState {
  const auth = useCurrentUser();
  if (auth.state !== "registered") {
    throw new Error(
      "useRegisteredUser requires a registered session — use it only under the " +
        "_authenticated route; elsewhere use useSessionUser or useCurrentUser.",
    );
  }
  return auth;
}

/**
 * The current real session — registered OR guest — or `undefined` for a
 * visitor / pre-registration principal (and while loading or errored). For
 * chrome rendered outside the auth gate (e.g. the NavBar avatar) that adapts to
 * whoever is signed in without forcing a redirect.
 */
export function useSessionUser(): SessionState | undefined {
  const auth = useCurrentUser();
  if (auth.state === "registered" || auth.state === "guest") {
    return auth;
  }
}
