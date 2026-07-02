import { useFullScreen } from "@hooks/useFullScreen";
import type { ReactNode } from "react";
import styles from "../Layout.module.css";

interface EndPanelProps {
  children: ReactNode;
  className?: string;
}
const EndPanel = ({ className, children }: EndPanelProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <aside
      className={`${styles.rightSidebar} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}
    >
      {children}
    </aside>
  );
};

export { EndPanel };
