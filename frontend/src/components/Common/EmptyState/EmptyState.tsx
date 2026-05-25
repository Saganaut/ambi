// Placeholder block for empty lists / no-data / loading-error states.
// Slots: optional icon, a required title, an optional message, an optional
// action node (typically a Btn). Kept layout-agnostic so callers can drop it
// into either centered hero space or a sidebar empty zone.
import type { ReactNode } from "react";
import styles from "./EmptyState.module.css";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  message?: ReactNode;
  action?: ReactNode;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const EmptyState = ({
  icon,
  title,
  message,
  action,
  size = "md",
  className,
}: EmptyStateProps) => (
  <div
    className={[styles.empty, styles[size], className]
      .filter(Boolean)
      .join(" ")}
    role='status'>
    {icon && (
      <span className={styles.icon} aria-hidden='true'>
        {icon}
      </span>
    )}
    <p className={styles.title}>{title}</p>
    {message && <p className={styles.message}>{message}</p>}
    {action && <div className={styles.action}>{action}</div>}
  </div>
);

export { EmptyState };
