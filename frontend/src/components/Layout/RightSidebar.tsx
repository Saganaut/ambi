import { useFullScreen } from "@/context/useFullScreen";
import type { ReactNode } from "react";
import styles from "./Layout.module.css";

interface RightSidebarProps {
  children: ReactNode;
  className?: string;
}
const RightSidebar = ({ className, children }: RightSidebarProps) => {
  const { isFullScreen } = useFullScreen();
  return (
    <aside
      className={`${styles.rightSidebar} ${isFullScreen ? styles.isCollapsed : " "} ${className}`}>
      {children}
    </aside>
  );
};

export { RightSidebar };
