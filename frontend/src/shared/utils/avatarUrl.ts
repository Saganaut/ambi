// Single home for avatar resolution. There are two entry points for the two
// avatar shapes the app deals with — both ultimately feed the shared <Avatar>:
//
//   1. resolveAvatarSrcSync/Async(src)  — for avatar src *strings*. External /
//      presigned URLs (Google OAuth, S3) pass through as-is; built-in
//      identifiers stored as `builtin:<value>` resolve to the Vite-bundled asset
//      URL by looking the value up in AVATAR_OPTIONS. Because the roster loads
//      its assets lazily, a built-in URL is resolved asynchronously and cached;
//      the sync form returns a cached URL or null. Built-in avatars are
//      persisted as stable identifiers (not Vite-hashed URLs) so a frontend
//      rebuild doesn't orphan every saved avatar.
//
//   2. resolveProfileAvatarSrc(avatar)  — for the backend's `Avatar` value
//      object: exactly one of `internalAvatarId` (built-in pick, becomes a
//      `builtin:<value>` string) or `image` (a gallery-backed AppImage,
//      resolved to a presigned variant URL).
//
// These compose: resolveProfileAvatarSrc may return a `builtin:<value>` string
// that still has to go through the resolveAvatarSrc helpers to render — which is
// exactly what <Avatar> does internally. Always render avatar srcs through
// <Avatar> (it owns the builtin→asset step) rather than a raw <img>.

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

// Built-in asset URLs are resolved lazily (avatarOptions' globs are non-eager),
// so a built-in id yields a URL only after its loader runs. This module-level
// cache holds each resolved URL for the session, so a given avatar loads once
// and every later render resolves it synchronously — no flicker on re-render or
// navigation.
const resolvedCache = new Map<string, string>();

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

// Synchronous resolution: non-built-in srcs (external/gallery URLs, null) pass
// through as-is; a built-in id resolves only if its URL is already cached,
// otherwise returns null to signal "resolve me asynchronously". Callers render
// their fallback (initial/icon) until the async result arrives.
export const resolveAvatarSrcSync = (
  src: string | null | undefined,
): string | null | undefined => {
  if (!isBuiltinAvatar(src)) return src;
  return resolvedCache.get(src.slice(BUILTIN_PREFIX.length)) ?? null;
};

// Asynchronous resolution: non-built-in srcs pass through; a built-in id runs
// its lazy loader (caching the URL), and an unknown built-in id passes through
// unchanged so the <img> onError fallback still fires.
export const resolveAvatarSrcAsync = async (
  src: string | null | undefined,
): Promise<string | null | undefined> => {
  if (!isBuiltinAvatar(src)) return src;
  const value = src.slice(BUILTIN_PREFIX.length);
  const cached = resolvedCache.get(value);
  if (cached) return cached;
  const option = optionByValue.get(value);
  if (!option) return src;
  const url = await option.loadSrc();
  resolvedCache.set(value, url);
  return url;
};

// Resolves the backend's `Avatar` value object down to a src for <Avatar>.
// A built-in pick yields a `builtin:<value>` string (resolved to the bundled
// asset by <Avatar> via the resolveAvatarSrc helpers); a gallery-backed pick yields a
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
