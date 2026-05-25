// Lightly-tinted card that groups a labelled set of settings (points,
// tolerance, scoring mode…) into one block. Reduces the "wall of inputs"
// feel and gives each related cluster its own surface.
import type { ReactNode } from "react";
import styles from "./_shared.module.css";

interface SettingsCardProps {
  title?: string;
  action?: ReactNode;
  children: ReactNode;
}

const SettingsCard = ({ title, action, children }: SettingsCardProps) => {
  return (
    <section className={styles.settingsCard}>
      {(title ?? action) && (
        <header className={styles.settingsCardHeader}>
          {title && <span className={styles.settingsCardTitle}>{title}</span>}
          {action}
        </header>
      )}
      <div className={styles.settingsCardBody}>{children}</div>
    </section>
  );
};

interface SettingsRowProps {
  children: ReactNode;
}

/** A flex row of equal-share fields. Use inside `SettingsCard` to lay out
 *  number inputs, dropdowns, and checkboxes on one line — wraps on narrow
 *  containers. */
const SettingsRow = ({ children }: SettingsRowProps) => {
  return <div className={styles.settingsRow}>{children}</div>;
};

export { SettingsCard, SettingsRow };
