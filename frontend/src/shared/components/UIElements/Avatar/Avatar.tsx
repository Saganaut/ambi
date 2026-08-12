// Profile picture with fallback. Renders the src image when provided; falls
// back to the first letter of `name`, then a generic person icon. Sized
// uniformly via the size prop so callers don't reinvent the circle.
import {
  isBuiltinAvatar,
  resolveAvatarSrcAsync,
  resolveAvatarSrcSync,
} from "@/shared/utils/avatarUrl";
import { UserIcon } from "@heroicons/react/24/solid";
import { useEffect, useState } from "react";
import styles from "./Avatar.module.css";

interface AvatarProps {
  src?: string | null;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Avatar = ({ src, name, alt, size = "md", className }: AvatarProps) => {
  const [errored, setErrored] = useState(false);
  // Non-built-in srcs (and already-cached built-ins) resolve synchronously here.
  // A built-in not yet in the cache resolves to null, then the effect loads its
  // bundled URL lazily — so importing the roster never fetches every avatar.
  const [resolvedSrc, setResolvedSrc] = useState(() => resolveAvatarSrcSync(src));

  useEffect(() => {
    setErrored(false);
    const sync = resolveAvatarSrcSync(src);
    setResolvedSrc(sync);
    if (sync != null || !isBuiltinAvatar(src)) return;
    let active = true;
    void resolveAvatarSrcAsync(src).then((url) => {
      if (active) setResolvedSrc(url);
    });
    return () => {
      active = false;
    };
  }, [src]);

  const showImage = Boolean(resolvedSrc) && !errored;
  const initial = name?.trim().charAt(0).toUpperCase();

  return (
    <>
      {showImage ? (
        <img
          src={resolvedSrc ?? ""}
          alt={alt ?? name ?? "User avatar"}
          className={styles.image}
          onError={() => {
            setErrored(true);
          }}
        />
      ) : initial ? (
        <span className={styles.initial} aria-hidden="true">
          {initial}
        </span>
      ) : (
        <UserIcon className={styles.icon} aria-hidden="true" />
      )}
    </>
  );
};

export { Avatar };
