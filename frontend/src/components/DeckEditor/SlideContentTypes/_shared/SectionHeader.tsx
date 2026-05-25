// Section divider used between groups of slide-editor fields. Carries a
// label, an optional hint, and an optional action slot (e.g. an "Add" button)
// so each list section reads as a single visual unit.
import type { ReactNode } from "react";
import styles from "./_shared.module.css";

interface SectionHeaderProps {
  label: string;
  hint?: string;
  action?: ReactNode;
}

const SectionHeader = ({ label, hint, action }: SectionHeaderProps) => {
  return (
    <div className={styles.sectionHeader}>
      <span className={styles.sectionLabel}>
        {label}
        {hint && <span className={styles.sectionHint}>{hint}</span>}
      </span>
      {action}
    </div>
  );
};

export { SectionHeader };
