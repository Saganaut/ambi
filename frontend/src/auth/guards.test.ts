// Unit coverage for the advisory authorization helpers. The ordering mirrors
// the backend (UserLevel.hasAccessTo weights / MembershipTier declaration
// order); the require* guards encode the redirect control-flow.
import { describe, it, expect } from "vitest";
import {
  levelAtLeast,
  tierAtLeast,
  requireRegistered,
  requireLevel,
} from "./guards";
import type { CurrentUserState, UserLevel } from "../hooks/useCurrentUser";

const loc = { href: "/account" };

const registered = (userLevel: UserLevel = "USER"): CurrentUserState => ({
  state: "registered",
  me: {},
  userLevel,
  effectiveTier: "FREE",
});

describe("levelAtLeast", () => {
  it("is true when the level meets or exceeds the minimum", () => {
    expect(levelAtLeast("USER", "USER")).toBe(true);
    expect(levelAtLeast("ADMIN", "USER")).toBe(true);
    expect(levelAtLeast("SUPER_ADMIN", "ADMIN")).toBe(true);
  });

  it("is false when the level is below the minimum", () => {
    expect(levelAtLeast("GUEST", "USER")).toBe(false);
    expect(levelAtLeast("USER", "ADMIN")).toBe(false);
    expect(levelAtLeast("PREMIUM_USER", "ADMIN")).toBe(false);
  });
});

describe("tierAtLeast", () => {
  it("orders tiers by declaration order", () => {
    expect(tierAtLeast("FREE", "FREE")).toBe(true);
    expect(tierAtLeast("ORG_BUSINESS", "INDIVIDUAL")).toBe(true);
    expect(tierAtLeast("FREE", "INDIVIDUAL")).toBe(false);
  });
});

describe("requireRegistered", () => {
  it("passes through while loading (gate component owns the loading frame)", () => {
    expect(() => requireRegistered({ state: "loading" }, loc)).not.toThrow();
  });

  it("passes for a registered session", () => {
    expect(() => requireRegistered(registered(), loc)).not.toThrow();
  });

  it("redirects every unregistered session", () => {
    expect(() => requireRegistered({ state: "visitor" }, loc)).toThrow();
    expect(() => requireRegistered({ state: "error" }, loc)).toThrow();
    expect(() =>
      requireRegistered({ state: "preRegistration", me: {} }, loc),
    ).toThrow();
  });
});

describe("requireLevel", () => {
  it("passes when registered and at/above the level", () => {
    expect(() => requireLevel(registered("ADMIN"), "ADMIN", loc)).not.toThrow();
  });

  it("redirects when registered but below the level", () => {
    expect(() => requireLevel(registered("USER"), "ADMIN", loc)).toThrow();
  });

  it("redirects an unregistered session before checking level", () => {
    expect(() => requireLevel({ state: "visitor" }, "USER", loc)).toThrow();
  });
});
