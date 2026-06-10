// Pins resolveProfileAvatarSrc's source priority for the backend's Avatar
// value object: a built-in pick yields the `builtin:<value>` convention string
// (resolved to a bundled asset by <Avatar>), an image pick resolves through
// the AppImage variant walk, and no avatar degrades to undefined.
import { describe, it, expect } from "vitest";
import { resolveProfileAvatarSrc, resolvePlayerAvatarSrc } from "./avatarUrl";
import type { Avatar } from "@auth/store/userApi.gen";

const imageAvatar: Avatar = {
  image: {
    external: false,
    srcKey: "https://s3.example/original",
    variants: {
      SM: "https://s3.example/sm",
      LG: "https://s3.example/lg",
    },
  },
};

describe("resolveProfileAvatarSrc", () => {
  it("returns undefined when no avatar is set", () => {
    expect(resolveProfileAvatarSrc(undefined)).toBeUndefined();
    expect(resolveProfileAvatarSrc(null)).toBeUndefined();
  });

  it("maps a built-in pick to the builtin: convention string", () => {
    expect(resolveProfileAvatarSrc({ internalAvatarId: "avatar-07" })).toBe(
      "builtin:avatar-07",
    );
  });

  it("resolves a gallery-backed pick to a variant URL", () => {
    expect(resolveProfileAvatarSrc(imageAvatar)).toBe("https://s3.example/sm");
  });

  it("returns undefined for an avatar with an empty image", () => {
    expect(
      resolveProfileAvatarSrc({
        image: { external: true, externalSrc: "", variants: {} },
      }),
    ).toBeUndefined();
  });
});

describe("resolvePlayerAvatarSrc", () => {
  it("delegates to the profile resolver, with null for the empty case", () => {
    expect(resolvePlayerAvatarSrc(undefined)).toBeNull();
    expect(resolvePlayerAvatarSrc(imageAvatar)).toBe("https://s3.example/sm");
  });
});
