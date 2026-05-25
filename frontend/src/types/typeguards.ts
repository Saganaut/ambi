import type { GuestUser, RegisteredUser } from "../store/BrainFlexApi";

export function isRegisteredUser(
  user: RegisteredUser | GuestUser,
): user is RegisteredUser {
  return typeof user === "object" && "name" in user && user.isGuest === false;
}

export function isGuestUser(
  user: RegisteredUser | GuestUser,
): user is GuestUser {
  return typeof user === "object" && user.isGuest === true;
}
