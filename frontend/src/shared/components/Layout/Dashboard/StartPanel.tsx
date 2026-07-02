import { useFullScreen } from "@/shared/hooks/useFullScreen";
import type { ReactNode } from "react";
import styles from "../Layout.module.css";

interface StartPanelProps {
  children: ReactNode;
  className?: string;
}

const StartPanel = ({ children, className }: StartPanelProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <aside
      className={`${styles.leftSidebar} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}
    >
      {children}
    </aside>
  );
};

export { StartPanel };
