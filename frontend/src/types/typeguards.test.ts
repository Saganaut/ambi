// Coverage for the CurrentUserState narrowing predicates.
import { describe, it, expect } from "vitest";
import {
  isRegistered,
  isGuest,
  isPreRegistration,
  isAuthenticated,
} from "./typeguards";
import type { CurrentUserState } from "../hooks/useCurrentUser";

const registered: CurrentUserState = {
  state: "registered",
  me: {},
  userLevel: "USER",
  effectiveTier: "FREE",
};
const guest: CurrentUserState = {
  state: "guest",
  me: {},
  userLevel: "GUEST",
  effectiveTier: "FREE",
};
const preReg: CurrentUserState = { state: "preRegistration", me: {} };
const visitor: CurrentUserState = { state: "visitor" };

describe("typeguards", () => {
  it("isRegistered only matches registered", () => {
    expect(isRegistered(registered)).toBe(true);
    expect(isRegistered(guest)).toBe(false);
    expect(isRegistered(visitor)).toBe(false);
  });

  it("isGuest only matches guest", () => {
    expect(isGuest(guest)).toBe(true);
    expect(isGuest(registered)).toBe(false);
  });

  it("isPreRegistration only matches preRegistration", () => {
    expect(isPreRegistration(preReg)).toBe(true);
    expect(isPreRegistration(visitor)).toBe(false);
  });

  it("isAuthenticated matches guest and registered", () => {
    expect(isAuthenticated(registered)).toBe(true);
    expect(isAuthenticated(guest)).toBe(true);
    expect(isAuthenticated(preReg)).toBe(false);
    expect(isAuthenticated(visitor)).toBe(false);
  });
});
