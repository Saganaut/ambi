// Guards the built-in avatar catalog. The roster is derived from
// import.meta.glob at build time, so a folder rename, a prefix typo, or a wrong
// glob path silently empties a collection with no runtime error — exactly the
// bug this module was created to fix (the old glob pointed at a nonexistent
// path, so no PNG avatar ever loaded). These invariants fail loudly instead.
import { describe, it, expect } from "vitest";
import {
  AVATAR_COLLECTIONS,
  AVATAR_OPTIONS,
  collectionIdForValue,
} from "./avatarOptions";
import { resolveAvatarSrcAsync, builtinAvatarUrl } from "@utils/avatarUrl";

// Expected roster sizes, per the files committed under
// src/shared/assets/images/mascots/. If assets are added/removed, update here.
const EXPECTED_COUNTS: Record<string, number> = {
  classic: 39, // 3 named SVGs + avatar_04..39
  dinosaurs: 36,
  latam: 58,
  african: 12,
  mythical: 12,
  pets: 12,
};

describe("AVATAR_COLLECTIONS", () => {
  it("has no empty collection (guards a silently-broken glob)", () => {
    for (const c of AVATAR_COLLECTIONS) {
      expect(c.options.length, `collection ${c.id} is empty`).toBeGreaterThan(0);
    }
  });

  it("matches the expected per-collection roster sizes", () => {
    const counts = Object.fromEntries(
      AVATAR_COLLECTIONS.map((c) => [c.id, c.options.length]),
    );
    expect(counts).toEqual(EXPECTED_COUNTS);
  });

  it("assigns every option a globally unique id", () => {
    const ids = AVATAR_OPTIONS.map((o) => o.value);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("gives every option a lazy loader (not an eagerly-resolved src)", () => {
    for (const o of AVATAR_OPTIONS) {
      expect(typeof o.loadSrc, `option ${o.value} has no loadSrc`).toBe(
        "function",
      );
    }
  });

  it("resolves a loader to a non-empty asset url", async () => {
    const [first] = AVATAR_OPTIONS;
    await expect(first.loadSrc()).resolves.toBeTruthy();
  });
});

describe("collectionIdForValue", () => {
  it("finds the collection a themed id belongs to", () => {
    expect(collectionIdForValue("dinosaur-01")).toBe("dinosaurs");
    expect(collectionIdForValue("latam-58")).toBe("latam");
    expect(collectionIdForValue("avatar-04")).toBe("classic");
  });

  it("returns undefined for unknown or nullish ids", () => {
    expect(collectionIdForValue("not-a-real-id")).toBeUndefined();
    expect(collectionIdForValue(null)).toBeUndefined();
    expect(collectionIdForValue(undefined)).toBeUndefined();
  });
});

describe("built-in id resolution (regression guard for the glob-path fix)", () => {
  it("resolves a themed built-in id to a real bundled asset, not the builtin: string", async () => {
    const resolved = await resolveAvatarSrcAsync(builtinAvatarUrl("dinosaur-01"));
    expect(resolved).not.toBe(builtinAvatarUrl("dinosaur-01"));
    expect(resolved).toBeTruthy();
  });

  it("passes an unknown built-in id through unchanged", async () => {
    const unknown = builtinAvatarUrl("nope-99");
    await expect(resolveAvatarSrcAsync(unknown)).resolves.toBe(unknown);
  });
});
