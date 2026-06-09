// Single home for avatar resolution. There are two entry points for the two
// avatar shapes the app deals with — both ultimately feed the shared <Avatar>:
//
//   1. resolveAvatarSrc(src)  — for account-picture *strings* (a user's
//      `pictureUrl`). External / presigned URLs (Google OAuth, S3) pass through
//      as-is; built-in identifiers stored as `builtin:<value>` resolve to the
//      Vite-bundled asset URL by looking the value up in AVATAR_OPTIONS.
//      Built-in avatars are persisted as stable identifiers (not Vite-hashed
//      URLs) so a frontend rebuild doesn't orphan every saved avatar.
//
//   2. resolvePlayerAvatarSrc(avatar)  — for the session player's unified
//      `Avatar` value object (KEY|LINK). LINK is the player's real picture URL.
//      KEY (a preset id) is dormant: the preset roster + lobby picker were
//      removed, so nothing sets KEY today — it resolves to null until a picker
//      is rebuilt.
//
// These compose: a LINK avatar's URL comes from the player's `pictureUrl`,
// which may itself be a `builtin:<value>` string. So the string returned by
// resolvePlayerAvatarSrc must still go through resolveAvatarSrc to render —
// which is exactly what <Avatar> does internally. Always render avatar srcs
// through <Avatar> (it owns the builtin→asset step) rather than a raw <img>.

import {
  AvatarOption,
  AVATAR_OPTIONS,
} from "@/shared/components/Forms/Input/AvatarSelector/AvatarSelector";
import { Avatar } from "@auth/store/userApi.gen";

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

// Resolves a session player's unified `avatar` (the backend's KEY|LINK value
// object) down to an image src.
//
//   KEY  — a preset id. Dormant: the preset roster + lobby picker were removed,
//          so nothing sets KEY today. Returns null and <Avatar> degrades to the
//          initial/icon. When the picker is rebuilt, resolve the key here.
//   LINK — a direct image URL (the player's real picture). May be null/empty
//          for a guest with no picture, in which case <Avatar> falls back to
//          the player's initial. May also be a `builtin:<value>` string when
//          the player picked a built-in account avatar — <Avatar> resolves that
//          via resolveAvatarSrc, so always render the result through <Avatar>.
export const resolvePlayerAvatarSrc = (
  avatar: Avatar | undefined,
): string | null => {
  if (!avatar) return null;
  if (avatar.avatarType === "KEY") return null;
  return avatar.avatarUrl ?? null;
};
