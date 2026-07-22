// Square rail button for the deck editor's right sidebar (DS SideMenuButton).
// Active state rides on aria-pressed so styling stays on the platform
// attribute rather than an invented state class.
import { type ReactNode } from "react";

import styles from "./SideMenuButton.module.css";

interface SideMenuButtonProps {
  label: string;
  icon: ReactNode;
  active: boolean;
  onClick: () => void;
}

const SideMenuButton = ({ label, icon, active, onClick }: SideMenuButtonProps) => {
  return (
    <button
      type='button'
      className={styles.sideMenuButton}
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}>
      {icon}
    </button>
  );
};

export { SideMenuButton };
