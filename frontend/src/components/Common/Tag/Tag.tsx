// Neutral pill-style label for category/metadata text. Distinct from Badge,
// which is reserved for semantic status (error/success/warning/info/brand).
// Tag can optionally be removable (renders an inline ✕) when onRemove is set.
import type { ReactNode } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import styles from "./Tag.module.css";

interface TagProps {
  children: ReactNode;
  size?: "sm" | "md";
  onRemove?: () => void;
  className?: string;
}

const Tag = ({ children, size = "md", onRemove, className }: TagProps) => (
  <span
    className={[styles.tag, styles[size], className].filter(Boolean).join(" ")}>
    <span className={styles.label}>{children}</span>
    {onRemove && (
      <button
        type='button'
        className={styles.remove}
        onClick={onRemove}
        aria-label='Remove tag'>
        <XMarkIcon />
      </button>
    )}
  </span>
);

export { Tag };
