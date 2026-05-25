// Inline status banner — feedback that belongs next to a field or section,
// not flying across the screen like Toast. The severity maps to a fixed
// (bg, text, border) triplet and an auto-picked icon; `info`/`success` are
// role="status", `warning`/`error` are role="alert". Pass `onDismiss` to add
// a chrome-less close button.
import type { ReactNode } from "react";
import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  XCircleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { IconBtn } from "@/components/Common/Buttons/IconBtn";
import styles from "./Alert.module.css";

type AlertSeverity = "info" | "success" | "warning" | "error";

interface AlertProps {
  severity: AlertSeverity;
  title?: string;
  children?: ReactNode;
  onDismiss?: () => void;
  icon?: ReactNode;
  compact?: boolean;
  className?: string;
}

const Alert = ({
  severity,
  title,
  children,
  onDismiss,
  icon,
  compact = false,
  className,
}: AlertProps) => {
  const isAssertive = severity === "warning" || severity === "error";

  return (
    <div
      role={isAssertive ? "alert" : "status"}
      aria-live={isAssertive ? "assertive" : "polite"}
      className={[
        styles.alert,
        styles[severity],
        compact ? styles.compact : null,
        className,
      ]
        .filter(Boolean)
        .join(" ")}>
      <span className={styles.icon} aria-hidden='true'>
        {icon ?? defaultIcon(severity)}
      </span>
      <div className={styles.body}>
        {title != null && title !== "" && (
          <p className={styles.title}>{title}</p>
        )}
        {children != null && <div className={styles.message}>{children}</div>}
      </div>
      {onDismiss != null && (
        <IconBtn
          fill='ghost'
          size='xs'
          icon={<XMarkIcon className={styles.dismissIcon} />}
          onClick={onDismiss}
          aria-label='Dismiss'
          className={styles.dismiss}
        />
      )}
    </div>
  );
};

const defaultIcon = (severity: AlertSeverity): ReactNode => {
  const className = styles.severityIcon;
  switch (severity) {
    case "info":
      return <InformationCircleIcon className={className} />;
    case "success":
      return <CheckCircleIcon className={className} />;
    case "warning":
      return <ExclamationTriangleIcon className={className} />;
    case "error":
      return <XCircleIcon className={className} />;
  }
};

export { Alert };
export type { AlertSeverity, AlertProps };
