/**
 * Mock data for the auth feature's `MeResponse` state machine.
 *
 * `GET /api/auth/me` returns a discriminated union keyed on `state`:
 * VISITOR → GUEST → PRE_REGISTRATION → REGISTERED. These mocks give each state
 * a ready-to-use instance plus an aggregate `MeResponse[]` for exercising the
 * `useCurrentUser` state machine and auth-gated UI.
 *
 * Conventions:
 *  - Every type is imported from `authApi.gen.ts` so these mocks stay in sync
 *    with codegen.
 *  - `publicId`s (`u_*`) cross-link with `accountMockData` / `deckMockData`.
 */
import type {
  GuestMe,
  MeResponse,
  PreRegistrationMe,
  RegisteredMe,
  UsernameAvailabilityResponse,
  VisitorMe,
} from "../store/authApi.gen";

// ─── MeResponse states ───────────────────────────────────────────────────────

export const mockVisitorMe: VisitorMe = {
  state: "VISITOR",
  authenticated: false,
  needsRegistration: false,
};

export const mockGuestMe: GuestMe = {
  state: "GUEST",
  authenticated: true,
  needsRegistration: false,
  publicId: "u_guest_legolas",
  username: "PrinceOfMirkwood",
  displayName: "Legolas",
  userLevel: "GUEST",
  effectiveTier: "FREE",
  membershipStatus: "NONE",
};

// A user who has authenticated with Google but not yet chosen a username.
export const mockPreRegistrationMe: PreRegistrationMe = {
  state: "PRE_REGISTRATION",
  authenticated: true,
  needsRegistration: true,
  email: "strider@dunedain.eriador",
};

export const mockRegisteredMe: RegisteredMe = {
  state: "REGISTERED",
  authenticated: true,
  needsRegistration: false,
  publicId: "u_frodo",
  username: "RingBearer99",
  displayName: "Frodo Baggins",
  email: "frodo@baggins.shire",
  userLevel: "PREMIUM_USER",
  effectiveTier: "INDIVIDUAL",
  membershipStatus: "ACTIVE",
};

// An org-seated registered user (Gandalf rides on the White Council's plan).
export const mockOrgRegisteredMe: RegisteredMe = {
  state: "REGISTERED",
  authenticated: true,
  needsRegistration: false,
  publicId: "u_gandalf",
  username: "Mithrandir",
  displayName: "Gandalf the Grey",
  email: "mithrandir@valinor.aman",
  userLevel: "ADMIN",
  effectiveTier: "ORG_BUSINESS",
  membershipStatus: "ACTIVE",
};

// One of each state, in the natural progression order.
export const mockMeResponses: MeResponse[] = [
  { ...mockVisitorMe, state: "VISITOR" },
  { ...mockGuestMe, state: "GUEST" },
  { ...mockPreRegistrationMe, state: "PRE_REGISTRATION" },
  { ...mockRegisteredMe, state: "REGISTERED" },
];

// ─── Username availability ───────────────────────────────────────────────────

export const mockUsernameAvailable: UsernameAvailabilityResponse = {
  username: "Strider",
  available: true,
};

export const mockUsernameTaken: UsernameAvailabilityResponse = {
  username: "RingBearer99",
  available: false,
};
