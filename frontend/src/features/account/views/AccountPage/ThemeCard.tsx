// Single theme card: color swatch preview, name, activate/edit/delete actions.
// Renders both preset themes (no edit/delete) and custom themes (owner-only
// edit/delete) — callers pass only the action callbacks that apply.
import { Btn } from "@ui/Buttons/Btn";
import styles from "./ThemeSection.module.css";

interface ThemeCardProps {
  huePrimary: number;
  hueAccent: number;
  name: string;
  isActive: boolean;
  isOrgShared?: boolean;
  onActivate?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
}

const ThemeCard = ({
  huePrimary,
  hueAccent,
  name,
  isActive,
  isOrgShared = false,
  onActivate,
  onEdit,
  onDelete,
}: ThemeCardProps) => {
  return (
    <div className={`${styles.card} ${isActive ? styles.cardActive : ""}`}>
      <div className={styles.cardSwatch} aria-hidden='true'>
        <div
          className={styles.swatchPrimary}
          style={{ background: `oklch(55% 0.2 ${huePrimary}deg)` }}
        />
        <div
          className={styles.swatchAccent}
          style={{ background: `oklch(65% 0.22 ${hueAccent}deg)` }}
        />
      </div>
      <div className={styles.cardBody}>
        <p className={styles.cardName} title={name}>
          {name}
        </p>
        <div className={styles.cardMeta}>
          {isActive && (
            <span className={`${styles.badge} ${styles.badgeActive}`}>
              Active
            </span>
          )}
          {isOrgShared && (
            <span className={`${styles.badge} ${styles.badgeOrg}`}>Org</span>
          )}
        </div>
      </div>
      <div className={styles.cardActions}>
        {!isActive && onActivate && (
          <Btn
            className={`${styles.cardActionBtn} ${styles.cardActionBtnPrimary}`}
            onClick={onActivate}>
            Activate
          </Btn>
        )}
        {onEdit && (
          <Btn className={styles.cardActionBtn} onClick={onEdit}>
            Edit
          </Btn>
        )}
        {onDelete && (
          <Btn
            className={`${styles.cardActionBtn} ${styles.cardActionBtnDanger}`}
            onClick={onDelete}>
            Delete
          </Btn>
        )}
      </div>
    </div>
  );
};

export { ThemeCard };
