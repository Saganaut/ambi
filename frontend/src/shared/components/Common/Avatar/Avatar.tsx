// Profile picture with fallback. Renders the src image when provided; falls
// back to the first letter of `name`, then a generic person icon. Sized
// uniformly via the size prop so callers don't reinvent the circle.
import { useState } from "react";
import { UserIcon } from "@heroicons/react/24/solid";
import styles from "./Avatar.module.css";
import { resolveAvatarSrc } from "@/shared/utils/avatarUrl";

interface AvatarProps {
  src?: string | null;
  name?: string;
  alt?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
}

const Avatar = ({ src, name, alt, size = "md", className }: AvatarProps) => {
  const [errored, setErrored] = useState(false);
  const resolvedSrc = resolveAvatarSrc(src);
  const showImage = Boolean(resolvedSrc) && !errored;
  const initial = name?.trim().charAt(0).toUpperCase();
  const wrapperClass = [styles.avatar, styles[size], className]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={wrapperClass} aria-label={alt ?? name}>
      {showImage ? (
        <img
          src={resolvedSrc ?? ""}
          alt={alt ?? name ?? ""}
          className={styles.image}
          onError={() => {
            setErrored(true);
          }}
        />
      ) : initial ? (
        <span className={styles.initial} aria-hidden='true'>
          {initial}
        </span>
      ) : (
        <UserIcon className={styles.icon} aria-hidden='true' />
      )}
    </span>
  );
};

export { Avatar };
