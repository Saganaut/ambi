// Horizontal progress bar with optional label. value/max are clamped so
// callers can pass raw counts. variant ties into the same semantic palette
// the rest of the design system uses; `indeterminate` flips the bar to a
// rolling animation for unknown-duration work.
import type { CSSProperties } from "react";
import styles from "./ProgressBar.module.css";

interface ProgressBarProps {
  value: number;
  max?: number;
  variant?: "default" | "brand" | "success" | "warning" | "error";
  color?: string;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  label?: string;
  indeterminate?: boolean;
  className?: string;
}

const ProgressBar = ({
  value,
  max = 100,
  variant = "default",
  color,
  size = "md",
  showLabel = false,
  label,
  indeterminate = false,
  className,
}: ProgressBarProps) => {
  const safeMax = max <= 0 ? 1 : max;
  const clamped = Math.max(0, Math.min(value, safeMax));
  const pct = (clamped / safeMax) * 100;
  const fillStyle = {
    ...(indeterminate ? {} : { "--progress-pct": `${pct.toString()}%` }),
    ...(color ? { backgroundColor: color } : {}),
  } as CSSProperties;
  const hasFillStyle = !indeterminate || Boolean(color);

  return (
    <div
      className={[styles.wrapper, styles[size], className]
        .filter(Boolean)
        .join(" ")}>
      {showLabel && (
        <div className={styles.labelRow}>
          <span className={styles.label}>{label ?? "Progress"}</span>
          <span className={styles.value}>
            {clamped.toString()} / {safeMax.toString()}
          </span>
        </div>
      )}
      <div
        className={styles.track}
        role='progressbar'
        aria-valuenow={indeterminate ? undefined : clamped}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-label={label ?? "Progress"}>
        <div
          className={[
            styles.fill,
            color ? "" : styles[variant],
            indeterminate ? styles.indeterminate : "",
          ]
            .filter(Boolean)
            .join(" ")}
          style={hasFillStyle ? fillStyle : undefined}
        />
      </div>
    </div>
  );
};

export { ProgressBar };
