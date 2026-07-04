// Single home for avatar resolution. There are two entry points for the two
// avatar shapes the app deals with — both ultimately feed the shared <Avatar>:
//
//   1. resolveAvatarSrc(src)  — for avatar src *strings*. External / presigned
//      URLs (Google OAuth, S3) pass through as-is; built-in identifiers stored
//      as `builtin:<value>` resolve to the Vite-bundled asset URL by looking
//      the value up in AVATAR_OPTIONS. Built-in avatars are persisted as stable
//      identifiers (not Vite-hashed URLs) so a frontend rebuild doesn't orphan
//      every saved avatar.
//
//   2. resolveProfileAvatarSrc(avatar)  — for the backend's `Avatar` value
//      object: exactly one of `internalAvatarId` (built-in pick, becomes a
//      `builtin:<value>` string) or `image` (a gallery-backed AppImage,
//      resolved to a presigned variant URL).
//
// These compose: resolveProfileAvatarSrc may return a `builtin:<value>` string
// that still has to go through resolveAvatarSrc to render — which is exactly
// what <Avatar> does internally. Always render avatar srcs through <Avatar>
// (it owns the builtin→asset step) rather than a raw <img>.

import {
  AvatarOption,
  AVATAR_OPTIONS,
} from "@/shared/components/Forms/Input/AvatarSelector/avatarOptions";
import { Avatar } from "@auth/store/userApi.gen";
import { resolveImageUrl } from "@utils/image";

const BUILTIN_PREFIX = "builtin:";

const optionByValue = new Map<string, AvatarOption>(
  AVATAR_OPTIONS.map((o) => [o.value, o]),
);

export const isBuiltinAvatar = (
  src: string | null | undefined,
): src is string => typeof src === "string" && src.startsWith(BUILTIN_PREFIX);

export const builtinAvatarValue = (
  src: string | null | undefined,
): string | null => {
  if (!isBuiltinAvatar(src)) return null;
  return src.slice(BUILTIN_PREFIX.length);
};

export const builtinAvatarUrl = (value: string): string =>
  `${BUILTIN_PREFIX}${value}`;

export const resolveAvatarSrc = <T extends string | null | undefined>(
  src: T,
): T => {
  if (!isBuiltinAvatar(src)) return src;
  const value = src.slice(BUILTIN_PREFIX.length);
  const option = optionByValue.get(value);
  return (option ? option.src : src) as T;
};

// Resolves the backend's `Avatar` value object down to a src for <Avatar>.
// A built-in pick yields a `builtin:<value>` string (resolved to the bundled
// asset by <Avatar> via resolveAvatarSrc); a gallery-backed pick yields a
// presigned variant URL. Returns undefined when no avatar is set, letting
// <Avatar> degrade to the initial/icon.
export const resolveProfileAvatarSrc = (
  avatar: Avatar | null | undefined,
): string | undefined => {
  if (!avatar) return undefined;
  if (avatar.internalAvatarId) return builtinAvatarUrl(avatar.internalAvatarId);
  return (
    resolveImageUrl(
      avatar.image,
      "SM",
      avatar.image?.id ?? "avatar",
      200,
      200,
      false,
    ) ?? undefined
  );
};

// Resolves a session player's avatar — the same `Avatar` value object the
// profile uses, embedded on the participant. Kept as a separate name so
// session call sites read naturally; <Avatar> still owns the builtin→asset
// step for the returned string.
export const resolvePlayerAvatarSrc = (
  avatar: Avatar | undefined,
): string | null => resolveProfileAvatarSrc(avatar) ?? null;
