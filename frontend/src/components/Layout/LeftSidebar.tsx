import { useFullScreen } from "@/context/useFullScreen";
import type { ReactNode } from "react";
import styles from "./Layout.module.css";

interface LeftSidebarProps {
  children: ReactNode;
  className?: string;
}

const LeftSidebar = ({ children, className }: LeftSidebarProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <aside
      className={`${styles.leftSidebar} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}>
      {children}
    </aside>
  );
};

export { LeftSidebar };
