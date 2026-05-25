// Hook that resolves the current session into one of four typed states,
// eliminating the need to check isGuest booleans or id="0" sentinel values.
import { useGetCurrentUserQuery } from "../store/BrainFlexApi";
import type { RegisteredUser, GuestUser } from "../store/BrainFlexApi";
import { isRegisteredUser, isGuestUser } from "../types/typeguards";

export type CurrentUserState =
  | { state: "loading" }
  | { state: "error" }
  | { state: "visitor" }
  | { state: "guest"; user: GuestUser }
  | { state: "registered"; user: RegisteredUser };

export function useCurrentUser(): CurrentUserState {
  const { data, isLoading, isError } = useGetCurrentUserQuery();

  if (isLoading) return { state: "loading" };
  if (isError) return { state: "error" };
  if (data == null) return { state: "visitor" };
  if (isGuestUser(data)) return { state: "guest", user: data };
  if (isRegisteredUser(data)) return { state: "registered", user: data };
  return { state: "visitor" };
}
